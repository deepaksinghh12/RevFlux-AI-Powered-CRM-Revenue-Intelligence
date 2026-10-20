import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer } from "http";

import authRoutes from "../routes/auth.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import EmailOTP from "../models/EmailOTP.js";
import MicrosoftAuthCode from "../models/MicrosoftAuthCode.js";
import { errorHandler } from "../middleware/error.middleware.js";
import {
  getMicrosoftConfig,
  validateTenantPolicy,
  generateOidcParams,
  signStateCookie,
  verifyStateCookie,
  createLinkingTicket,
  verifyLinkingTicket,
  sanitizeReturnTo,
  buildAuthorizationUrl,
  validateIdToken,
  injectMockJwks,
  resetJwksCache,
  createExchangeCode,
  consumeExchangeCode,
  MS_PERSONAL_TENANT_ID,
} from "../services/microsoftAuth.service.js";

let app;
let httpServer;
let port;

const JWT_SECRET = "ms_test_jwt_secret_998877";
process.env.JWT_SECRET = JWT_SECRET;
process.env.MICROSOFT_CLIENT_ID = "test-client-id-12345";
process.env.MICROSOFT_CLIENT_SECRET = "test-client-secret-abcde";
process.env.MICROSOFT_TENANT_ID = "common";
process.env.CLIENT_URL = "http://localhost:5173";

// Generate mock RSA key pair for OIDC token signing tests
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const mockJwk = publicKey.export({ format: "jwk" });
mockJwk.kid = "test-mock-key-id-1";
mockJwk.use = "sig";
mockJwk.alg = "RS256";

before(async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";
  let testUri;
  if (mongoUri.includes("/?")) {
    testUri = mongoUri.replace("/?", "/revflux_test_ms_auth?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_ms_auth$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_ms_auth`;
  } else {
    testUri = `${mongoUri}/revflux_test_ms_auth`;
  }

  await mongoose.connect(testUri);

  app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use(errorHandler);

  httpServer = createServer(app);
  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });

  // Inject mock JWKS so tests don't make outbound network requests
  injectMockJwks([mockJwk]);
});

after(async () => {
  resetJwksCache();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (httpServer) {
    httpServer.close();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Microsoft Entra ID (OIDC) Authentication Suite", () => {
  describe("1. Security Helpers & Policy Enforcement", () => {
    it("should generate cryptographically random state, nonce, and compliant 64-character PKCE parameters", () => {
      const p1 = generateOidcParams();
      const p2 = generateOidcParams();

      assert.strictEqual(typeof p1.state, "string");
      assert.strictEqual(typeof p1.nonce, "string");
      assert.strictEqual(typeof p1.codeVerifier, "string");
      assert.strictEqual(typeof p1.codeChallenge, "string");

      // RFC 7636 verifier length must be 43-128 chars
      assert.ok(p1.codeVerifier.length >= 43 && p1.codeVerifier.length <= 128);

      assert.notStrictEqual(p1.state, p2.state);
      assert.notStrictEqual(p1.nonce, p2.nonce);
      assert.notStrictEqual(p1.codeVerifier, p2.codeVerifier);
    });

    it("should sign and verify state cookie with HMAC integrity protection", () => {
      const payload = {
        state: "state_123",
        nonce: "nonce_456",
        codeVerifier: "verifier_789",
        returnTo: "http://localhost:5173/dashboard",
        createdAt: Date.now(),
      };

      const signedCookie = signStateCookie(payload, JWT_SECRET);
      assert.ok(signedCookie.includes("."));

      const verified = verifyStateCookie(signedCookie, JWT_SECRET);
      assert.strictEqual(verified.state, "state_123");
      assert.strictEqual(verified.nonce, "nonce_456");

      // Tampered cookie payload must be rejected
      const [data, signature] = signedCookie.split(".");
      const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, state: "hacked_state" })).toString("base64url");
      const tampered = `${tamperedPayload}.${signature}`;
      assert.throws(() => verifyStateCookie(tampered, JWT_SECRET), /integrity check failed/i);
    });

    it("should reject expired state cookies", () => {
      const expiredPayload = {
        state: "state_old",
        nonce: "nonce_old",
        createdAt: Date.now() - 20 * 60 * 1000, // 20 minutes ago (exceeds 15m TTL)
      };
      const signed = signStateCookie(expiredPayload, JWT_SECRET);
      assert.throws(() => verifyStateCookie(signed, JWT_SECRET), /expired/i);
    });

    it("should enforce tenant policies: reject personal accounts when organizations policy is active", () => {
      const orgConfig = {
        tenantPolicy: "organizations",
        tenantId: "organizations",
        allowedTenants: [],
      };

      // Valid work/school tenant
      assert.strictEqual(validateTenantPolicy("f8cdef31-a31e-4b4a-93e4-5f571e91255a", orgConfig), true);

      // Personal consumer account must be rejected
      assert.throws(
        () => validateTenantPolicy(MS_PERSONAL_TENANT_ID, orgConfig),
        /personal microsoft accounts are not permitted/i
      );
    });

    it("should accept both personal accounts and work/school accounts when common policy is active", () => {
      const commonConfig = {
        tenantPolicy: "common",
        tenantId: "common",
        allowedTenants: [],
      };

      // Valid work/school tenant
      assert.strictEqual(validateTenantPolicy("f8cdef31-a31e-4b4a-93e4-5f571e91255a", commonConfig), true);

      // Personal consumer account must be accepted under common
      assert.strictEqual(validateTenantPolicy(MS_PERSONAL_TENANT_ID, commonConfig), true);
    });

    it("should default to common tenant policy permitting both personal and enterprise accounts", () => {
      delete process.env.MICROSOFT_TENANT_ID;
      delete process.env.MICROSOFT_TENANT_POLICY;
      const config = getMicrosoftConfig();
      assert.strictEqual(config.tenantId, "common");
      assert.strictEqual(config.tenantPolicy, "common");
      assert.strictEqual(validateTenantPolicy(MS_PERSONAL_TENANT_ID, config), true);
      assert.strictEqual(validateTenantPolicy("f8cdef31-a31e-4b4a-93e4-5f571e91255a", config), true);
      process.env.MICROSOFT_TENANT_ID = "common";
    });

    it("should enforce single-tenant policy strictly", () => {
      const singleConfig = {
        tenantPolicy: "single",
        tenantId: "allowed-tenant-guid-111",
        allowedTenants: [],
      };

      assert.strictEqual(validateTenantPolicy("allowed-tenant-guid-111", singleConfig), true);
      assert.throws(
        () => validateTenantPolicy("other-tenant-guid-222", singleConfig),
        /does not match required tenant/i
      );
    });

    it("should prevent open redirects with sanitizeReturnTo", () => {
      const clientUrl = "http://localhost:5173";

      // Safe relative paths
      assert.strictEqual(sanitizeReturnTo("/dashboard", clientUrl), "http://localhost:5173/dashboard");
      assert.strictEqual(sanitizeReturnTo("/leads?status=open", clientUrl), "http://localhost:5173/leads?status=open");

      // Malicious protocol-relative or external redirects must fallback to clientUrl
      assert.strictEqual(sanitizeReturnTo("//evil.com", clientUrl), clientUrl);
      assert.strictEqual(sanitizeReturnTo("https://evil.com/phish", clientUrl), clientUrl);
      assert.strictEqual(sanitizeReturnTo("/\\evil.com", clientUrl), clientUrl);
    });

    it("should create and verify account-linking tickets", () => {
      const linkingData = {
        email: "alice@company.com",
        microsoftId: "tenant-1:object-1",
        microsoftTenantId: "tenant-1",
        microsoftObjectId: "object-1",
        name: "Alice Corp",
      };

      const ticket = createLinkingTicket(linkingData, JWT_SECRET);
      const decoded = verifyLinkingTicket(ticket, JWT_SECRET);

      assert.strictEqual(decoded.email, "alice@company.com");
      assert.strictEqual(decoded.microsoftId, "tenant-1:object-1");
      assert.strictEqual(decoded.action, "link_microsoft");

      // Bad ticket must throw
      assert.throws(() => verifyLinkingTicket("bad.invalid.ticket", JWT_SECRET), /invalid or expired/i);
    });
  });

  describe("2. ID Token Validation with RS256 JWKS", () => {
    it("should successfully validate an authentic Microsoft ID token", async () => {
      const tid = "work-tenant-guid-999";
      const oid = "user-object-guid-888";
      const nonce = "test-nonce-123";

      const tokenPayload = {
        sub: oid,
        oid: oid,
        tid: tid,
        aud: "test-client-id-12345",
        iss: `https://login.microsoftonline.com/${tid}/v2.0`,
        nonce: nonce,
        email: "alice@workplace.com",
        name: "Alice Engineer",
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000) - 10,
        iat: Math.floor(Date.now() / 1000) - 10,
      };

      const idToken = jwt.sign(tokenPayload, privateKey, {
        algorithm: "RS256",
        keyid: mockJwk.kid,
      });

      const verified = await validateIdToken({
        idToken,
        expectedNonce: nonce,
        config: {
          clientId: "test-client-id-12345",
          tenantId: "organizations",
          tenantPolicy: "organizations",
          allowedTenants: [],
        },
      });

      assert.strictEqual(verified.oid, oid);
      assert.strictEqual(verified.tid, tid);
      assert.strictEqual(verified.microsoftId, `${tid}:${oid}`);
      assert.strictEqual(verified.email, "alice@workplace.com");
      assert.strictEqual(verified.name, "Alice Engineer");
    });

    it("should successfully validate a personal Microsoft ID token under common policy", async () => {
      const tid = MS_PERSONAL_TENANT_ID;
      const oid = "personal-user-guid-777";
      const nonce = "test-nonce-personal";

      const tokenPayload = {
        sub: oid,
        oid: oid,
        tid: tid,
        aud: "test-client-id-12345",
        iss: `https://login.microsoftonline.com/${tid}/v2.0`,
        nonce: nonce,
        email: "personal_user@outlook.com",
        name: "Personal User",
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000) - 10,
        iat: Math.floor(Date.now() / 1000) - 10,
      };

      const idToken = jwt.sign(tokenPayload, privateKey, {
        algorithm: "RS256",
        keyid: mockJwk.kid,
      });

      const verified = await validateIdToken({
        idToken,
        expectedNonce: nonce,
        config: {
          clientId: "test-client-id-12345",
          tenantId: "common",
          tenantPolicy: "common",
          allowedTenants: [],
        },
      });

      assert.strictEqual(verified.oid, oid);
      assert.strictEqual(verified.tid, MS_PERSONAL_TENANT_ID);
      assert.strictEqual(verified.microsoftId, `${MS_PERSONAL_TENANT_ID}:${oid}`);
      assert.strictEqual(verified.email, "personal_user@outlook.com");
      assert.strictEqual(verified.name, "Personal User");
    });

    it("should reject an ID token with mismatched audience", async () => {
      const tid = "work-tenant-guid-999";
      const tokenPayload = {
        sub: "user-1",
        oid: "user-1",
        tid: tid,
        aud: "wrong-audience-client-id",
        iss: `https://login.microsoftonline.com/${tid}/v2.0`,
        nonce: "test-nonce",
        email: "bob@company.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const idToken = jwt.sign(tokenPayload, privateKey, {
        algorithm: "RS256",
        keyid: mockJwk.kid,
      });

      await assert.rejects(
        async () => {
          await validateIdToken({
            idToken,
            expectedNonce: "test-nonce",
            config: {
              clientId: "test-client-id-12345",
              tenantId: "organizations",
              tenantPolicy: "organizations",
              allowedTenants: [],
            },
          });
        },
        /invalid microsoft id token/i
      );
    });

    it("should reject an ID token with mismatched nonce (replay attack)", async () => {
      const tid = "work-tenant-guid-999";
      const tokenPayload = {
        sub: "user-1",
        oid: "user-1",
        tid: tid,
        aud: "test-client-id-12345",
        iss: `https://login.microsoftonline.com/${tid}/v2.0`,
        nonce: "stolen-old-nonce",
        email: "bob@company.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const idToken = jwt.sign(tokenPayload, privateKey, {
        algorithm: "RS256",
        keyid: mockJwk.kid,
      });

      await assert.rejects(
        async () => {
          await validateIdToken({
            idToken,
            expectedNonce: "fresh-session-nonce",
            config: {
              clientId: "test-client-id-12345",
              tenantId: "organizations",
              tenantPolicy: "organizations",
              allowedTenants: [],
            },
          });
        },
        /nonce mismatch/i
      );
    });
  });

  describe("3. Partial Unique Index & Identity Isolation", () => {
    it("should permit multiple users with null or missing microsoftId without collisions", async () => {
      // User 1: missing microsoftId
      const u1 = await User.create({
        name: "Regular User 1",
        email: "reg1@test.com",
        password: "Password123!",
      });

      // User 2: missing microsoftId
      const u2 = await User.create({
        name: "Regular User 2",
        email: "reg2@test.com",
        password: "Password123!",
      });

      // User 3: explicitly undefined/null microsoftId
      const u3 = await User.create({
        name: "Regular User 3",
        email: "reg3@test.com",
        password: "Password123!",
        microsoftId: undefined,
      });

      assert.ok(u1._id);
      assert.ok(u2._id);
      assert.ok(u3._id);

      // Verify that string microsoftId enforces uniqueness
      await User.create({
        name: "MS User 1",
        email: "ms1@test.com",
        password: "Password123!",
        microsoftId: "tid-1:oid-1",
      });

      await assert.rejects(
        async () => {
          await User.create({
            name: "MS User 2 Duplicate",
            email: "ms2@test.com",
            password: "Password123!",
            microsoftId: "tid-1:oid-1",
          });
        },
        /E11000.*duplicate key/i
      );
    });
  });

  describe("4. Short-Lived Single-Use Authorization Code Exchange (Zero JWT in URL)", () => {
    it("should create a 60-second exchange code and atomically consume it exactly once", async () => {
      const user = await User.create({
        name: "Exchange User",
        email: "exchange@test.com",
        password: "Password123!",
      });

      const rawCode = await createExchangeCode({ userId: user._id, tokenVersion: user.tokenVersion || 0 });
      assert.strictEqual(typeof rawCode, "string");
      assert.strictEqual(rawCode.length, 64);

      // First exchange attempt: succeeds
      const record = await consumeExchangeCode(rawCode);
      assert.ok(record);
      assert.strictEqual(record.user.toString(), user._id.toString());
      assert.strictEqual(record.consumed, false); // prior state returned

      // Second exchange attempt (replay attack): must return null
      const replayRecord = await consumeExchangeCode(rawCode);
      assert.strictEqual(replayRecord, null);
    });

    it("should reject expired exchange codes", async () => {
      const user = await User.create({
        name: "Expired Code User",
        email: "expcode@test.com",
        password: "Password123!",
      });

      const rawCode = crypto.randomBytes(32).toString("hex");
      const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

      // Insert directly with past expiry
      await MicrosoftAuthCode.create({
        codeHash,
        user: user._id,
        tokenVersion: 0,
        consumed: false,
        expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
      });

      const record = await consumeExchangeCode(rawCode);
      assert.strictEqual(record, null);
    });

    it("should exchange valid code via POST /api/auth/microsoft/exchange and issue RevFlux JWT", async () => {
      const user = await User.create({
        name: "API Exchange User",
        email: "apiexchange@test.com",
        password: "Password123!",
      });

      const org = await Organization.create({ name: "API Org" });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

      const rawCode = await createExchangeCode({ userId: user._id, tokenVersion: user.tokenVersion || 0 });

      const res = await fetch(`http://localhost:${port}/api/auth/microsoft/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, "apiexchange@test.com");

      // Verify the token is a valid RevFlux JWT
      const decoded = jwt.verify(data.token, JWT_SECRET);
      assert.strictEqual(decoded.id, user._id.toString());

      // Attempting to reuse the same code must return 401
      const reuseRes = await fetch(`http://localhost:${port}/api/auth/microsoft/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });
      assert.strictEqual(reuseRes.status, 401);
    });

    it("should reject exchange if user session was revoked (tokenVersion incremented)", async () => {
      const user = await User.create({
        name: "Revoked Code User",
        email: "revokedcode@test.com",
        password: "Password123!",
        tokenVersion: 0,
      });

      const rawCode = await createExchangeCode({ userId: user._id, tokenVersion: 0 });

      // Revoke user sessions before code exchange
      user.tokenVersion = 1;
      await user.save();

      const res = await fetch(`http://localhost:${port}/api/auth/microsoft/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: rawCode }),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /session has been revoked/i);
    });
  });

  describe("5. Account Linking for Password & Passwordless (OTP) Users", () => {
    it("should allow a password-enabled user to link Microsoft account with password", async () => {
      const user = await User.create({
        name: "Password User",
        email: "pwuser@enterprise.com",
        password: "ValidSecurePassword123!",
      });

      const org = await Organization.create({ name: "PW Org" });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

      const ticket = createLinkingTicket(
        {
          email: "pwuser@enterprise.com",
          microsoftId: "tid-100:oid-200",
          microsoftTenantId: "tid-100",
          microsoftObjectId: "oid-200",
          name: "MS User",
        },
        JWT_SECRET
      );

      // Wrong password fails
      const failRes = await fetch(`http://localhost:${port}/api/auth/microsoft/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, password: "WrongPassword" }),
      });
      assert.strictEqual(failRes.status, 401);

      // Correct password succeeds
      const successRes = await fetch(`http://localhost:${port}/api/auth/microsoft/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, password: "ValidSecurePassword123!" }),
      });
      assert.strictEqual(successRes.status, 200);

      const updated = await User.findById(user._id);
      assert.strictEqual(updated.microsoftId, "tid-100:oid-200");
    });

    it("should allow a passwordless (Google or OTP) user to link Microsoft account via Email OTP", async () => {
      // Simulate Google OAuth or OTP user with unrevealed random password
      const user = await User.create({
        name: "Google Only User",
        email: "googleuser@company.com",
        password: crypto.randomBytes(24).toString("hex"),
      });

      const org = await Organization.create({ name: "Google Org" });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

      const ticket = createLinkingTicket(
        {
          email: "googleuser@company.com",
          microsoftId: "tid-300:oid-400",
          microsoftTenantId: "tid-300",
          microsoftObjectId: "oid-400",
          name: "MS Google User",
        },
        JWT_SECRET
      );

      // Request OTP
      const otpRes = await fetch(`http://localhost:${port}/api/auth/microsoft/link/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });

      assert.strictEqual(otpRes.status, 200);
      const otpData = await otpRes.json();
      assert.strictEqual(otpData.success, true);

      // Look up generated OTP record in DB to simulate email receipt
      const otpRecord = await EmailOTP.findOne({ email: "googleuser@company.com" });
      assert.ok(otpRecord);

      // Attempt linking with wrong OTP fails
      const wrongOtpRes = await fetch(`http://localhost:${port}/api/auth/microsoft/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, otp: "000000" }),
      });
      assert.strictEqual(wrongOtpRes.status, 400);

      // Create a deterministic OTP for testing the success branch
      const testOtp = "654321";
      const salt = await bcrypt.genSalt(10);
      otpRecord.otpHash = await bcrypt.hash(testOtp, salt);
      await otpRecord.save();

      // Submit valid OTP
      const successRes = await fetch(`http://localhost:${port}/api/auth/microsoft/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, otp: testOtp }),
      });

      assert.strictEqual(successRes.status, 200);
      const successData = await successRes.json();
      assert.strictEqual(successData.success, true);
      assert.ok(successData.token);

      // Confirm user record was linked and OTP record was consumed
      const updated = await User.findById(user._id);
      assert.strictEqual(updated.microsoftId, "tid-300:oid-400");

      const consumedOtp = await EmailOTP.findOne({ email: "googleuser@company.com" });
      assert.strictEqual(consumedOtp, null);
    });

    it("should prevent duplicate Microsoft identities across different accounts", async () => {
      await User.create({
        name: "User One",
        email: "u1@company.com",
        password: "Password123!",
        microsoftId: "tid-shared:oid-shared",
      });

      await User.create({
        name: "User Two",
        email: "u2@company.com",
        password: "Password123!",
      });

      const ticket = createLinkingTicket(
        {
          email: "u2@company.com",
          microsoftId: "tid-shared:oid-shared",
          microsoftTenantId: "tid-shared",
          microsoftObjectId: "oid-shared",
          name: "User Two",
        },
        JWT_SECRET
      );

      const res = await fetch(`http://localhost:${port}/api/auth/microsoft/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, password: "Password123!" }),
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /already linked to another revflux user/i);
    });
  });

  describe("6. Error Sanitization & Callback Security", () => {
    it("should redirect with generic sanitized error on user cancellation without leaking details", async () => {
      const sessionPayload = {
        state: "state_sanitized_cancel",
        nonce: "nonce_1",
        codeVerifier: "verifier_1",
        returnTo: "http://localhost:5173/login",
        createdAt: Date.now(),
      };
      const signedCookie = signStateCookie(sessionPayload, JWT_SECRET);

      const res = await fetch(
        `http://localhost:${port}/api/auth/microsoft/callback?error=access_denied&error_description=AADB2C90091:+User+cancelled+flow`,
        {
          headers: {
            Cookie: `ms_auth_session=${encodeURIComponent(signedCookie)}`,
          },
          redirect: "manual",
        }
      );

      assert.strictEqual(res.status, 302);
      const redirectLocation = res.headers.get("location");
      assert.ok(redirectLocation.includes("/login?error="));
      assert.ok(redirectLocation.includes("cancelled"));
      // Internal Azure error code must NOT be leaked
      assert.strictEqual(redirectLocation.includes("AADB2C90091"), false);
    });
  });
});

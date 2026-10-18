import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import { createServer } from "http";

import authRoutes from "../routes/auth.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { errorHandler } from "../middleware/error.middleware.js";

let app;
let httpServer;
let port;

const JWT_SECRET = "session_test_secret_revflux_12345";
process.env.JWT_SECRET = JWT_SECRET;

before(async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";
  const lower = mongoUri.toLowerCase();
  const env = (process.env.NODE_ENV || "").toLowerCase();
  if (lower.includes("prod") || env.includes("prod")) {
    throw new Error("Cannot run test against production DB");
  }
  let testUri;
  if (mongoUri.includes("/?")) {
    testUri = mongoUri.replace("/?", "/revflux_test_session?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_session$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_session`;
  } else {
    testUri = `${mongoUri}/revflux_test_session`;
  }
  if (!testUri.includes("/revflux_test_session") || testUri === mongoUri) {
    throw new Error("Test URI isolation failed");
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
});

after(async () => {
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

const makeRequest = async (method, path, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const mintToken = (userId, tv, secret = JWT_SECRET, expiresIn = "1h") => {
  const payload = { id: userId };
  if (tv !== undefined) {
    payload.tv = tv;
  }
  return jwt.sign(payload, secret, { expiresIn });
};

describe("Phase 1A — Session Revocation Engine & Authentication Integrity", () => {
  describe("1. Token Version Issuance & Verification", () => {
    it("should issue a token containing tv: 0 on user registration and allow access", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Alice Revoke",
        email: "alice.revoke@example.com",
        password: "Password123!",
      });

      assert.strictEqual(regRes.status, 201);
      assert.ok(regRes.data.token);

      const decoded = jwt.decode(regRes.data.token);
      assert.strictEqual(decoded.tv, 0);

      // Access protected /api/auth/me
      const meRes = await makeRequest("GET", "/api/auth/me", null, regRes.data.token);
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.data.user.email, "alice.revoke@example.com");
    });

    it("should reject access when a token has an older or mismatched token version", async () => {
      const user = await User.create({
        name: "Bob Revoke",
        email: "bob.revoke@example.com",
        password: "Password123!",
        tokenVersion: 2,
      });

      // Token with mismatched version 1
      const staleToken = mintToken(user._id.toString(), 1);
      const res = await makeRequest("GET", "/api/auth/me", null, staleToken);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.message, "Not authorized, session has been revoked");

      // Token with matching version 2
      const validToken = mintToken(user._id.toString(), 2);
      const validRes = await makeRequest("GET", "/api/auth/me", null, validToken);
      assert.strictEqual(validRes.status, 200);
    });
  });

  describe("2. Explicit Session Revocation Endpoint (/api/auth/account/revoke-sessions)", () => {
    it("should invalidate prior session token and return a new active token", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Carol Session",
        email: "carol.session@example.com",
        password: "Password123!",
      });
      const initialToken = regRes.data.token;

      // Verify initial session works
      const initialCheck = await makeRequest("GET", "/api/auth/me", null, initialToken);
      assert.strictEqual(initialCheck.status, 200);

      // Call revoke-sessions
      const revokeRes = await makeRequest(
        "POST",
        "/api/auth/account/revoke-sessions",
        {},
        initialToken
      );

      assert.strictEqual(revokeRes.status, 200);
      assert.strictEqual(revokeRes.data.success, true);
      assert.ok(revokeRes.data.token);
      assert.notStrictEqual(revokeRes.data.token, initialToken);

      const newToken = revokeRes.data.token;
      const decodedNew = jwt.decode(newToken);
      assert.strictEqual(decodedNew.tv, 1);

      // Verify the old token is now rejected with 401
      const staleCheck = await makeRequest("GET", "/api/auth/me", null, initialToken);
      assert.strictEqual(staleCheck.status, 401);
      assert.strictEqual(staleCheck.data.message, "Not authorized, session has been revoked");

      // Verify the new token works
      const newCheck = await makeRequest("GET", "/api/auth/me", null, newToken);
      assert.strictEqual(newCheck.status, 200);
    });

    it("should re-authenticate with password if provided, and reject invalid password without revoking", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Dave Security",
        email: "dave.security@example.com",
        password: "CorrectPassword123!",
      });
      const currentToken = regRes.data.token;

      // Revoke with incorrect password confirmation
      const failRevoke = await makeRequest(
        "POST",
        "/api/auth/account/revoke-sessions",
        { password: "WrongPassword" },
        currentToken
      );

      assert.strictEqual(failRevoke.status, 401);
      assert.strictEqual(failRevoke.data.message, "Invalid password confirmation");

      // Verify token is NOT revoked because password confirmation failed
      const checkStillActive = await makeRequest("GET", "/api/auth/me", null, currentToken);
      assert.strictEqual(checkStillActive.status, 200);

      // Revoke with correct password confirmation
      const successRevoke = await makeRequest(
        "POST",
        "/api/auth/account/revoke-sessions",
        { password: "CorrectPassword123!" },
        currentToken
      );

      assert.strictEqual(successRevoke.status, 200);
      assert.strictEqual(successRevoke.data.success, true);
      assert.ok(successRevoke.data.token);

      // Now original token is revoked
      const checkRevoked = await makeRequest("GET", "/api/auth/me", null, currentToken);
      assert.strictEqual(checkRevoked.status, 401);
    });

    it("should allow re-login after revocation and issue fresh token with updated tokenVersion", async () => {
      await makeRequest("POST", "/api/auth/register", {
        name: "Eve Relogin",
        email: "eve.relogin@example.com",
        password: "Password123!",
      });

      // Login initially
      const login1 = await makeRequest("POST", "/api/auth/login", {
        email: "eve.relogin@example.com",
        password: "Password123!",
      });
      const token1 = login1.data.token;

      // Revoke all sessions
      await makeRequest("POST", "/api/auth/account/revoke-sessions", {}, token1);

      // token1 must fail
      const staleRes = await makeRequest("GET", "/api/auth/me", null, token1);
      assert.strictEqual(staleRes.status, 401);

      // Log in again
      const login2 = await makeRequest("POST", "/api/auth/login", {
        email: "eve.relogin@example.com",
        password: "Password123!",
      });
      assert.strictEqual(login2.status, 200);
      assert.ok(login2.data.token);

      const decoded2 = jwt.decode(login2.data.token);
      assert.strictEqual(decoded2.tv, 1);

      // New token must succeed
      const freshRes = await makeRequest("GET", "/api/auth/me", null, login2.data.token);
      assert.strictEqual(freshRes.status, 200);
    });
  });

  describe("3. Password Change Session Invalidation", () => {
    it("should increment tokenVersion and revoke existing sessions when password is changed", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Frank Password",
        email: "frank.password@example.com",
        password: "InitialPassword123!",
      });
      const initialToken = regRes.data.token;

      // Update password via profile update
      const updateRes = await makeRequest(
        "PUT",
        "/api/auth/profile",
        { password: "NewStrongPassword456!" },
        initialToken
      );

      assert.strictEqual(updateRes.status, 200);
      assert.ok(updateRes.data.token, "Should return fresh token upon password change");
      assert.notStrictEqual(updateRes.data.token, initialToken);

      // Initial token must now be rejected
      const staleRes = await makeRequest("GET", "/api/auth/me", null, initialToken);
      assert.strictEqual(staleRes.status, 401);
      assert.strictEqual(staleRes.data.message, "Not authorized, session has been revoked");

      // Fresh token from update response must work
      const freshRes = await makeRequest("GET", "/api/auth/me", null, updateRes.data.token);
      assert.strictEqual(freshRes.status, 200);

      // Login with new password must work and issue matching token
      const reLogin = await makeRequest("POST", "/api/auth/login", {
        email: "frank.password@example.com",
        password: "NewStrongPassword456!",
      });
      assert.strictEqual(reLogin.status, 200);
      const reLoginDecoded = jwt.decode(reLogin.data.token);
      assert.strictEqual(reLoginDecoded.tv, 1);
    });

    it("should NOT increment tokenVersion when updating non-password profile fields", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Grace Name",
        email: "grace.name@example.com",
        password: "Password123!",
      });
      const currentToken = regRes.data.token;

      // Update non-password field
      const updateRes = await makeRequest(
        "PUT",
        "/api/auth/profile",
        { name: "Grace Updated", phone: "+1 555-0199" },
        currentToken
      );

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.data.user.name, "Grace Updated");

      // Existing token remains valid
      const meRes = await makeRequest("GET", "/api/auth/me", null, currentToken);
      assert.strictEqual(meRes.status, 200);
    });
  });

  describe("4. Legacy Token Handling & Migration Window", () => {
    it("should accept legacy tokens without tv claim when user is at baseline (tv === 0)", async () => {
      const user = await User.create({
        name: "Hank Legacy",
        email: "hank.legacy@example.com",
        password: "Password123!",
        tokenVersion: 0,
      });

      // Legacy token with only { id } and NO tv claim
      const legacyToken = mintToken(user._id.toString(), undefined);
      const decoded = jwt.decode(legacyToken);
      assert.strictEqual(decoded.tv, undefined);

      const res = await makeRequest("GET", "/api/auth/me", null, legacyToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.user.email, "hank.legacy@example.com");
    });

    it("should reject legacy tokens once user has revoked sessions (tv > 0)", async () => {
      const user = await User.create({
        name: "Ivy Migrated",
        email: "ivy.migrated@example.com",
        password: "Password123!",
        tokenVersion: 1, // Revoked or updated password previously
      });

      // Legacy token without tv claim cannot bypass revocation
      const legacyToken = mintToken(user._id.toString(), undefined);
      const res = await makeRequest("GET", "/api/auth/me", null, legacyToken);

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.message, "Not authorized, session has been revoked");
    });
  });

  describe("5. Cross-User Isolation", () => {
    it("should ensure revoking sessions for User A does NOT affect User B", async () => {
      const userARes = await makeRequest("POST", "/api/auth/register", {
        name: "User Alpha",
        email: "alpha@example.com",
        password: "Password123!",
      });
      const tokenA = userARes.data.token;

      const userBRes = await makeRequest("POST", "/api/auth/register", {
        name: "User Beta",
        email: "beta@example.com",
        password: "Password123!",
      });
      const tokenB = userBRes.data.token;

      // Revoke sessions for User A
      await makeRequest("POST", "/api/auth/account/revoke-sessions", {}, tokenA);

      // User A's old token is revoked
      const resA = await makeRequest("GET", "/api/auth/me", null, tokenA);
      assert.strictEqual(resA.status, 401);

      // User B's token remains completely valid
      const resB = await makeRequest("GET", "/api/auth/me", null, tokenB);
      assert.strictEqual(resB.status, 200);
      assert.strictEqual(resB.data.user.email, "beta@example.com");
    });
  });

  describe("6. Account Status Gate (Deactivated & Suspended Accounts)", () => {
    it("should reject deactivated users even with an otherwise valid, current-version token", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Jack Deactivated",
        email: "jack.deactivated@example.com",
        password: "Password123!",
      });
      const token = regRes.data.token;

      // Mark user as deactivated in DB
      await User.updateOne({ email: "jack.deactivated@example.com" }, { status: "deactivated" });

      const res = await makeRequest("GET", "/api/auth/me", null, token);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.message, "Not authorized, account is deactivated or suspended");
    });

    it("should reject suspended users even with an otherwise valid, current-version token", async () => {
      const regRes = await makeRequest("POST", "/api/auth/register", {
        name: "Karen Suspended",
        email: "karen.suspended@example.com",
        password: "Password123!",
      });
      const token = regRes.data.token;

      // Mark user as suspended in DB
      await User.updateOne({ email: "karen.suspended@example.com" }, { status: "suspended" });

      const res = await makeRequest("GET", "/api/auth/me", null, token);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.message, "Not authorized, account is deactivated or suspended");

      // Reactivate account
      await User.updateOne({ email: "karen.suspended@example.com" }, { status: "active" });
      const activeRes = await makeRequest("GET", "/api/auth/me", null, token);
      assert.strictEqual(activeRes.status, 200);
    });
  });
});

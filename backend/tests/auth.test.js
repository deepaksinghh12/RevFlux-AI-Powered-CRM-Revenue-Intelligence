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
import bcrypt from "bcryptjs";
import { Resend } from "resend";

let app;
let httpServer;
let port;

const JWT_SECRET = "auth_test_secret_12345";
process.env.JWT_SECRET = JWT_SECRET;

before(async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";
  const testUri = mongoUri.replace(/\/[a-zA-Z0-9_-]+(\?|$)/, "/revflux_test_auth$1");
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

const generateTestToken = (id, secret = JWT_SECRET, expiresIn = "1h") => {
  return jwt.sign({ id }, secret, { expiresIn });
};

describe("Phase A — Authentication Foundation & Test Suite", () => {
  
  describe("1. Registration Flow", () => {
    it("should register a valid user and create an organization with owner membership", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alice Founder",
          email: "alice@acme.com",
          password: "SecurePassword123!",
          company: "Acme Enterprise",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, "alice@acme.com");
      assert.strictEqual(data.user.name, "Alice Founder");
      assert.strictEqual(data.user.workspaces.length, 1);
      assert.strictEqual(data.user.workspaces[0].name, "Acme Enterprise");
      assert.strictEqual(data.user.workspaces[0].role, "owner");

      // Verify password was hashed in DB and not stored plain
      const dbUser = await User.findOne({ email: "alice@acme.com" }).select("+password");
      assert.ok(dbUser.password);
      assert.notStrictEqual(dbUser.password, "SecurePassword123!");
      assert.ok(dbUser.password.startsWith("$2a$") || dbUser.password.startsWith("$2b$"));
    });

    it("should reject registration with an existing email address", async () => {
      await User.create({ name: "Existing", email: "existing@example.com", password: "password123" });

      const res = await fetch(`http://localhost:${port}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imposter",
          email: "existing@example.com",
          password: "anotherpassword",
        }),
      });

      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /already exists/i);
    });

    it("should reject registration with missing required fields", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "bad@email",
          password: "123",
        }),
      });

      assert.strictEqual(res.status, 400);
    });
  });

  describe("2. Login Flow", () => {
    beforeEach(async () => {
      const user = await User.create({ name: "Bob Sales", email: "bob@sales.com", password: "CorrectPassword123!" });
      const org = await Organization.create({ name: "Bob's Team" });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "manager", status: "active" });
    });

    it("should successfully log in with valid credentials", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bob@sales.com",
          password: "CorrectPassword123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, "bob@sales.com");
      assert.strictEqual(data.user.workspaces[0].role, "manager");
    });

    it("should reject login with an incorrect password", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "bob@sales.com",
          password: "WrongPassword!",
        }),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.message, "Invalid email or password");
    });

    it("should reject login for an unknown email address (preventing enumeration)", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@sales.com",
          password: "SomePassword123!",
        }),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.message, "Invalid email or password");
    });
  });

  describe("3. Protected Route Gate & Token Verification", () => {
    it("should reject access when no Authorization token header is present", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/me`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /no token provided/i);
    });

    it("should reject access when an invalid/tampered token is provided", async () => {
      const user = await User.create({ name: "Charlie", email: "charlie@test.com", password: "password123" });
      const badToken = generateTestToken(user._id, "wrong_secret");

      const res = await fetch(`http://localhost:${port}/api/auth/me`, {
        headers: { Authorization: `Bearer ${badToken}` },
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /invalid or expired/i);
    });

    it("should reject access when token is expired", async () => {
      const user = await User.create({ name: "Expired User", email: "expired@test.com", password: "password123" });
      const expiredToken = generateTestToken(user._id, JWT_SECRET, "-1s");

      const res = await fetch(`http://localhost:${port}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      assert.strictEqual(res.status, 401);
    });

    it("should allow access when a valid Bearer token is provided", async () => {
      const user = await User.create({ name: "Valid User", email: "valid@test.com", password: "password123" });
      const validToken = generateTestToken(user._id);

      const res = await fetch(`http://localhost:${port}/api/auth/me`, {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.email, "valid@test.com");
    });
  });

  describe("4. Google OAuth Safety Handling", () => {
    it("should reject google auth requests without a credential payload", async () => {
      const res = await fetch(`http://localhost:${port}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /credential token is required/i);
    });
  });

  describe("5. OTP Passwordless Authentication", () => {
    const EmailOTP = mongoose.model("EmailOTP");
    const sampleResend = new Resend("mock_test_key");
    const EmailsProto = Object.getPrototypeOf(sampleResend.emails);
    const originalSend = EmailsProto.send;

    after(() => {
      EmailsProto.send = originalSend;
    });

    it("should successfully request an OTP when Resend confirms delivery", async () => {
      EmailsProto.send = async () => ({
        data: { id: "msg_success_123" },
        error: null,
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "successful_delivery@example.com" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, "If the email is valid, an OTP has been sent.");

      const otpRecord = await EmailOTP.findOne({ email: "successful_delivery@example.com" });
      assert.ok(otpRecord, "OTP record should be stored on successful delivery");
      assert.ok(otpRecord.otpHash, "OTP hash should exist");
      assert.strictEqual(otpRecord.attempts, 0);
    });

    it("should return HTTP 502 and client-safe message when Resend rejects delivery", async () => {
      EmailsProto.send = async () => ({
        data: null,
        error: {
          statusCode: 403,
          name: "validation_error",
          message: "The domain example.com is not verified. To fix this, verify your domain at resend.com/domains",
        },
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "rejected_domain@example.com" }),
      });

      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Unable to deliver verification code. Please try again later.");
    });

    it("should return HTTP 502 and client-safe message when Resend throws a network exception", async () => {
      EmailsProto.send = async () => {
        throw new Error("ETIMEDOUT: Connection to api.resend.com timed out");
      };

      const res = await fetch(`http://localhost:${port}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "network_timeout@example.com" }),
      });

      assert.strictEqual(res.status, 502);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Unable to deliver verification code. Please try again later.");
    });

    it("should not leak provider details, raw error payloads, API keys, or stack traces on delivery failure", async () => {
      EmailsProto.send = async () => ({
        data: null,
        error: {
          statusCode: 403,
          name: "restricted_api_key",
          message: "API key re_123456789 cannot send from onboarding@resend.dev to unauthorized recipient",
        },
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "leak_check@example.com" }),
      });

      assert.strictEqual(res.status, 502);
      const rawBody = await res.text();
      assert.strictEqual(rawBody.toLowerCase().includes("resend"), false, "Should not leak provider name");
      assert.strictEqual(rawBody.includes("re_123456789"), false, "Should not leak API key");
      assert.strictEqual(rawBody.includes("restricted_api_key"), false, "Should not leak raw error name");
      assert.strictEqual(rawBody.includes("unauthorized recipient"), false, "Should not leak raw error message");
      assert.strictEqual(rawBody.includes("stack"), false, "Should not leak stack trace");
    });

    it("should maintain safe OTP state after a delivery failure and reject subsequent verification", async () => {
      const plainOtp = "654321";
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(plainOtp, salt);
      await EmailOTP.create({
        email: "failed_delivery@example.com",
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60000),
      });

      EmailsProto.send = async () => ({
        data: null,
        error: {
          statusCode: 403,
          message: "Sender domain not allowed",
        },
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "failed_delivery@example.com" }),
      });
      assert.strictEqual(res.status, 502);

      const otpRecord = await EmailOTP.findOne({ email: "failed_delivery@example.com" });
      assert.strictEqual(otpRecord, null, "No OTP should remain active after delivery failure");

      const verifyRes = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "failed_delivery@example.com", otp: plainOtp }),
      });
      assert.strictEqual(verifyRes.status, 400);
      const verifyData = await verifyRes.json();
      assert.strictEqual(verifyData.message, "Invalid or expired OTP");
    });

    it("should verify correct OTP for a new user and return a JWT", async () => {
      const plainOtp = "123456";
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(plainOtp, salt);
      
      await EmailOTP.create({
        email: "newotp@example.com",
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60000)
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "newotp@example.com", otp: plainOtp }),
      });
      
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, "newotp@example.com");

      const otpRecord = await EmailOTP.findOne({ email: "newotp@example.com" });
      assert.strictEqual(otpRecord, null, "OTP should be consumed");
    });

    it("should reject invalid OTP and increment attempts", async () => {
      const plainOtp = "123456";
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(plainOtp, salt);
      
      await EmailOTP.create({
        email: "wrongotp@example.com",
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60000)
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrongotp@example.com", otp: "654321" }),
      });
      
      assert.strictEqual(res.status, 400);

      const otpRecord = await EmailOTP.findOne({ email: "wrongotp@example.com" });
      assert.strictEqual(otpRecord.attempts, 1);
    });

    it("should reject expired OTP", async () => {
      const plainOtp = "123456";
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash(plainOtp, salt);
      
      await EmailOTP.create({
        email: "expiredotp@example.com",
        otpHash,
        expiresAt: new Date(Date.now() - 10 * 60000) // Expired
      });

      const res = await fetch(`http://localhost:${port}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "expiredotp@example.com", otp: plainOtp }),
      });
      
      assert.strictEqual(res.status, 400);
      const otpRecord = await EmailOTP.findOne({ email: "expiredotp@example.com" });
      assert.strictEqual(otpRecord, null, "Expired OTP should be deleted");
    });
  });
});

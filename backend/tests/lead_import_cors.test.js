import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";

import leadRoutes from "../routes/lead.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { errorHandler } from "../middleware/error.middleware.js";
import { isOriginAllowed, corsOptions } from "../utils/cors.js";

let app;
let server;
let port;

const JWT_SECRET = "lead_import_cors_jwt_secret_12345";
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
    testUri = mongoUri.replace("/?", "/revflux_test_import_cors?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_import_cors$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_import_cors`;
  } else {
    testUri = `${mongoUri}/revflux_test_import_cors`;
  }
  await mongoose.connect(testUri);

  app = express();
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use("/api/leads", leadRoutes);
  app.use(errorHandler);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (server) {
    server.close();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const makeRequest = async (method, path, body = null, token = null, orgId = null, origin = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (orgId) headers["X-Organization-Id"] = orgId.toString();
  if (origin) headers["Origin"] = origin;

  const url = `http://localhost:${port}${path}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (err) {}
  return { status: res.status, headers: res.headers, data };
};

describe("CORS Policy & Origin Hardening Suite (Phase 2)", () => {
  it("1. Allows exact production origins", () => {
    assert.strictEqual(isOriginAllowed("https://revflux.deepaksinghdev.in"), true);
    assert.strictEqual(isOriginAllowed("https://www.revflux.deepaksinghdev.in"), true);
  });

  it("2. Allows configured CLIENT_URL origins", () => {
    const prevClientUrl = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "https://custom-portal.revflux.io, https://staging.revflux.io";
    try {
      assert.strictEqual(isOriginAllowed("https://custom-portal.revflux.io"), true);
      assert.strictEqual(isOriginAllowed("https://staging.revflux.io"), true);
    } finally {
      process.env.CLIENT_URL = prevClientUrl;
    }
  });

  it("3. Allows RevFlux-specific Vercel preview deployments", () => {
    assert.strictEqual(isOriginAllowed("https://revflux.vercel.app"), true);
    assert.strictEqual(isOriginAllowed("https://revflux-preview-123.vercel.app"), true);
    assert.strictEqual(isOriginAllowed("https://revflux-git-main-deepak.vercel.app"), true);
  });

  it("4. Rejects arbitrary non-RevFlux Vercel preview origins", () => {
    assert.strictEqual(isOriginAllowed("https://evil-phish.vercel.app"), false);
    assert.strictEqual(isOriginAllowed("https://malicious-app.vercel.app"), false);
    assert.strictEqual(isOriginAllowed("https://attacker-revflux.vercel.app"), false);
  });

  it("5. Rejects arbitrary unapproved subdomains under deepaksinghdev.in", () => {
    assert.strictEqual(isOriginAllowed("https://attacker.deepaksinghdev.in"), false);
    assert.strictEqual(isOriginAllowed("https://otherproject.deepaksinghdev.in"), false);
  });

  it("6. Rejects local development origins in production environment", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.strictEqual(isOriginAllowed("http://localhost:5173"), false);
      assert.strictEqual(isOriginAllowed("http://127.0.0.1:5173"), false);
      assert.strictEqual(isOriginAllowed("http://localhost:3000"), false);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it("7. Allows local development origins in non-production environments", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      assert.strictEqual(isOriginAllowed("http://localhost:5173"), true);
      assert.strictEqual(isOriginAllowed("http://127.0.0.1:5173"), true);
      assert.strictEqual(isOriginAllowed("http://localhost:3000"), true);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it("8. Allows requests without an origin header (curl, server-to-server, mobile)", () => {
    assert.strictEqual(isOriginAllowed(undefined), true);
    assert.strictEqual(isOriginAllowed(""), true);
  });
});

describe("CSV Lead Import Quota Enforcement Suite (Phase 3)", () => {
  it("1. Free plan import within limit succeeds", async () => {
    const org = await Organization.create({ name: "Free Org", plan: "free", leadLimit: 50 });
    const user = await User.create({ name: "Free Admin", email: "free@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    const leads = [
      { name: "Lead 1", email: "l1@corp.com" },
      { name: "Lead 2", email: "l2@corp.com" },
      { name: "Lead 3", email: "l3@corp.com" },
    ];

    const res = await makeRequest("POST", "/api/leads/import", { leads }, token, org._id);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.importedCount, 3);

    const inDb = await Lead.countDocuments({ organization: org._id });
    assert.strictEqual(inDb, 3);
  });

  it("2. Free plan import exceeding limit is rejected upfront with 402", async () => {
    const org = await Organization.create({ name: "Free Org 2", plan: "free", leadLimit: 50 });
    const user = await User.create({ name: "Free User", email: "free2@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    // 55 leads exceeds 50 limit
    const leads = Array.from({ length: 55 }, (_, i) => ({
      name: `Exceed Lead ${i}`,
      email: `exceed${i}@test.com`,
    }));

    const res = await makeRequest("POST", "/api/leads/import", { leads }, token, org._id);
    assert.strictEqual(res.status, 402);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Lead limit reached/i);

    // Verify ZERO leads were inserted
    const inDb = await Lead.countDocuments({ organization: org._id });
    assert.strictEqual(inDb, 0);
  });

  it("3. Existing leads plus incoming rows exceeding limit is rejected", async () => {
    const org = await Organization.create({ name: "Free Org 3", plan: "free", leadLimit: 50 });
    const user = await User.create({ name: "Free User 3", email: "free3@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    // Seed 45 leads
    const existing = Array.from({ length: 45 }, (_, i) => ({
      organization: org._id,
      owner: user._id,
      name: `Existing ${i}`,
      email: `exist${i}@test.com`,
    }));
    await Lead.insertMany(existing);

    // Attempt to import 10 more leads (45 + 10 = 55 > 50)
    const incoming = Array.from({ length: 10 }, (_, i) => ({
      name: `Incoming ${i}`,
      email: `in${i}@test.com`,
    }));

    const res = await makeRequest("POST", "/api/leads/import", { leads: incoming }, token, org._id);
    assert.strictEqual(res.status, 402);

    // Verify existing 45 remain and 0 incoming were inserted
    const inDb = await Lead.countDocuments({ organization: org._id });
    assert.strictEqual(inDb, 45);
  });

  it("4. Soft-deleted leads are excluded from active lead count", async () => {
    const org = await Organization.create({ name: "Free Org 4", plan: "free", leadLimit: 50 });
    const user = await User.create({ name: "Free User 4", email: "free4@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    // Seed 48 leads, but 40 of them are soft-deleted
    const leadsData = Array.from({ length: 48 }, (_, i) => ({
      organization: org._id,
      owner: user._id,
      name: `Lead ${i}`,
      email: `del${i}@test.com`,
      isDeleted: i < 40, // 40 soft-deleted, 8 active
    }));
    await Lead.insertMany(leadsData);

    // Active count is 8. Importing 10 more makes 18 <= 50. Should succeed!
    const incoming = Array.from({ length: 10 }, (_, i) => ({
      name: `New Active ${i}`,
      email: `newact${i}@test.com`,
    }));

    const res = await makeRequest("POST", "/api/leads/import", { leads: incoming }, token, org._id);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.importedCount, 10);
  });

  it("5. Cross-organization isolation prevents quota bleeding", async () => {
    const org1 = await Organization.create({ name: "Org 1 Full", plan: "free", leadLimit: 50 });
    const org2 = await Organization.create({ name: "Org 2 Empty", plan: "free", leadLimit: 50 });

    const user1 = await User.create({ name: "U1", email: "u1@org1.com", password: "Password123!" });
    const user2 = await User.create({ name: "U2", email: "u2@org2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user1._id, organization: org1._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: user2._id, organization: org2._id, role: "owner", status: "active" });

    const token2 = jwt.sign({ id: user2._id, tv: 0 }, JWT_SECRET);

    // Seed Org 1 to 50 leads (maxed out)
    const org1Leads = Array.from({ length: 50 }, (_, i) => ({
      organization: org1._id,
      owner: user1._id,
      name: `Org1 Lead ${i}`,
      email: `o1_${i}@test.com`,
    }));
    await Lead.insertMany(org1Leads);

    // Org 2 has 0 leads. Org 2 importing 10 leads must succeed!
    const incoming = Array.from({ length: 10 }, (_, i) => ({
      name: `Org2 Lead ${i}`,
      email: `o2_${i}@test.com`,
    }));

    const res = await makeRequest("POST", "/api/leads/import", { leads: incoming }, token2, org2._id);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.importedCount, 10);

    const org2DbCount = await Lead.countDocuments({ organization: org2._id });
    assert.strictEqual(org2DbCount, 10);
  });

  it("6. Rejected import does not partially create leads", async () => {
    const org = await Organization.create({ name: "Atomic Org", plan: "free", leadLimit: 10 });
    const user = await User.create({ name: "Atomic User", email: "atomic@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    // 15 leads when limit is 10
    const incoming = Array.from({ length: 15 }, (_, i) => ({
      name: `Atomic Lead ${i}`,
      email: `atomic_${i}@test.com`,
    }));

    const res = await makeRequest("POST", "/api/leads/import", { leads: incoming }, token, org._id);
    assert.strictEqual(res.status, 402);

    const inDb = await Lead.countDocuments({ organization: org._id });
    assert.strictEqual(inDb, 0); // Exactly zero leads partially created
  });

  it("7. Starter limit (500) and Business unlimited plan behavior", async () => {
    // Starter org: limit 500
    const starterOrg = await Organization.create({ name: "Starter Org", plan: "starter", leadLimit: 500 });
    const starterUser = await User.create({ name: "Starter User", email: "starter@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: starterUser._id, organization: starterOrg._id, role: "owner", status: "active" });

    const starterToken = jwt.sign({ id: starterUser._id, tv: 0 }, JWT_SECRET);

    const starterBatch = Array.from({ length: 100 }, (_, i) => ({
      name: `Starter Lead ${i}`,
      email: `starter_${i}@test.com`,
    }));
    const resStarter = await makeRequest("POST", "/api/leads/import", { leads: starterBatch }, starterToken, starterOrg._id);
    assert.strictEqual(resStarter.status, 201);
    assert.strictEqual(resStarter.data.importedCount, 100);

    // Business org: unlimited
    const businessOrg = await Organization.create({ name: "Business Org", plan: "business", leadLimit: 999999 });
    const businessUser = await User.create({ name: "Business User", email: "biz@org.com", password: "Password123!" });
    await OrganizationMembership.create({ user: businessUser._id, organization: businessOrg._id, role: "owner", status: "active" });

    const bizToken = jwt.sign({ id: businessUser._id, tv: 0 }, JWT_SECRET);

    const bizBatch = Array.from({ length: 60 }, (_, i) => ({
      name: `Biz Lead ${i}`,
      email: `biz_${i}@test.com`,
    }));
    const resBiz = await makeRequest("POST", "/api/leads/import", { leads: bizBatch }, bizToken, businessOrg._id);
    assert.strictEqual(resBiz.status, 201);
    assert.strictEqual(resBiz.data.importedCount, 60);
  });
});

describe("Client Chat State Machine & UI Helper Logic Suite (Phase 1)", () => {
  it("1. Recipient read state excludes sender and only turns blue when recipient reads", () => {
    const senderId = "670f1a2b3c4d5e6f7a8b9c01";
    const recipientId = "670f1a2b3c4d5e6f7a8b9c02";

    // Message created: contains sender in readBy
    const msg = {
      id: "msg_1",
      sender: { _id: senderId, name: "Sender" },
      text: "Hello",
      deliveredTo: [],
      readBy: [{ user: { _id: senderId }, readAt: new Date() }],
    };

    // Calculate recipient reads
    const getUserId = (u) => (u?._id || u?.id || u || "").toString();
    const recipientReads = (msg.readBy || []).filter((r) => {
      const rId = getUserId(r.user || r);
      return rId && rId !== senderId;
    });

    assert.strictEqual(recipientReads.length, 0);

    // Blue tick condition: recipientReads.length > 0
    const isReadByRecipient = recipientReads.length > 0;
    assert.strictEqual(isReadByRecipient, false);

    // Recipient reads the message
    msg.readBy.push({ user: { _id: recipientId }, readAt: new Date() });

    const recipientReadsAfter = (msg.readBy || []).filter((r) => {
      const rId = getUserId(r.user || r);
      return rId && rId !== senderId;
    });

    assert.strictEqual(recipientReadsAfter.length, 1);
    assert.strictEqual(recipientReadsAfter.length > 0, true); // Now turns blue!
  });

  it("2. Deduplication merges REST history and real-time socket events without duplicates", () => {
    const restMessages = [
      { id: "m1", clientMessageId: "c1", text: "First" },
      { id: "m2", clientMessageId: "c2", text: "Second" },
    ];

    const socketMessages = [
      { id: "m2", clientMessageId: "c2", text: "Second" }, // overlap
      { id: "m3", clientMessageId: "c3", text: "Third" },
    ];

    const merged = [...restMessages];
    for (const m of socketMessages) {
      const key = (m.clientMessageId || m.id || m._id || "").toString();
      if (
        key &&
        !merged.some(
          (existing) => (existing.clientMessageId || existing.id || existing._id || "").toString() === key
        )
      ) {
        merged.push(m);
      }
    }

    assert.strictEqual(merged.length, 3);
    assert.deepStrictEqual(merged.map((m) => m.id), ["m1", "m2", "m3"]);
  });

  it("3. Rapid conversation switching request ID guards discard stale responses", () => {
    let activeRequestId = 0;
    let displayedMessages = [];

    // User selects Conversation A
    const reqAId = ++activeRequestId;

    // User rapidly switches to Conversation B
    const reqBId = ++activeRequestId;

    // Stale response from Conversation A arrives after B
    const responseA = [{ id: "msg_A1", text: "Conv A" }];
    if (reqAId === activeRequestId) {
      displayedMessages = responseA; // Must not execute
    }

    // Response from Conversation B arrives
    const responseB = [{ id: "msg_B1", text: "Conv B" }];
    if (reqBId === activeRequestId) {
      displayedMessages = responseB;
    }

    assert.strictEqual(displayedMessages.length, 1);
    assert.strictEqual(displayedMessages[0].id, "msg_B1");
  });
});

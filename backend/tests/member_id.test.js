import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import { createServer } from "http";

import chatRoutes from "../routes/chat.routes.js";
import teamRoutes from "../routes/team.routes.js";
import orgRoutes from "../routes/organization.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import ActivityLog from "../models/ActivityLog.js";
import { allocateMemberId, generateUniqueOrgCode, formatMemberId } from "../utils/memberId.js";
import { runMemberIdBackfill } from "../utils/memberIdBackfill.js";
import { errorHandler } from "../middleware/error.middleware.js";

let app;
let httpServer;
let port;

const JWT_SECRET = "member_id_qa_test_secret_123456";
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
    testUri = mongoUri.replace("/?", "/revflux_test_member_id?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_member_id$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_member_id`;
  } else {
    testUri = `${mongoUri}/revflux_test_member_id`;
  }
  if (!testUri.includes("/revflux_test_member_id") || testUri === mongoUri) {
    throw new Error("Test URI isolation failed");
  }
  await mongoose.connect(testUri);

  app = express();
  app.use(express.json());
  app.use("/api/chat", chatRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/organization", orgRoutes);
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

const makeRequest = async (method, path, body = null, token = null, orgId = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (orgId) headers["X-Organization-Id"] = orgId.toString();

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`http://localhost:${port}${path}`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

describe("RevFlux Organization-Specific Member ID Suite", () => {
  it("1. Unique Member IDs within an organization", async () => {
    const org = await Organization.create({ name: "Alpha Tech", code: "ALPHA" });
    const user1 = await User.create({ name: "User 1", email: "u1@alpha.com", password: "Password123!" });
    const user2 = await User.create({ name: "User 2", email: "u2@alpha.com", password: "Password123!" });

    const m1 = await OrganizationMembership.create({ user: user1._id, organization: org._id, role: "owner", status: "active" });
    const m2 = await OrganizationMembership.create({ user: user2._id, organization: org._id, role: "rep", status: "active" });

    assert.ok(m1.memberId);
    assert.ok(m2.memberId);
    assert.notStrictEqual(m1.memberId, m2.memberId);
    assert.strictEqual(m1.memberId, "ALPHA-001");
    assert.strictEqual(m2.memberId, "ALPHA-002");
  });

  it("2. Correct organization-code prefix", async () => {
    const orgMeta = await Organization.create({ name: "Meta Platforms", code: "META" });
    const user = await User.create({ name: "Mark", email: "mark@meta.com", password: "Password123!" });

    const membership = await OrganizationMembership.create({
      user: user._id,
      organization: orgMeta._id,
      role: "owner",
      status: "active",
    });

    assert.strictEqual(membership.memberId, "META-001");
    assert.strictEqual(membership.memberSeq, 1);
  });

  it("3. Atomic allocation under concurrent membership creation", async () => {
    const org = await Organization.create({ name: "Scale Dynamics", code: "SCALE" });

    // Spawn 10 concurrent membership creations
    const users = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        User.create({ name: `User ${i}`, email: `user${i}@scale.com`, password: "Password123!" })
      )
    );

    const memberships = await Promise.all(
      users.map((u) =>
        OrganizationMembership.create({
          user: u._id,
          organization: org._id,
          role: "rep",
          status: "active",
        })
      )
    );

    const memberIds = memberships.map((m) => m.memberId);
    const memberSeqs = memberships.map((m) => m.memberSeq);

    // Assert all 10 Member IDs are strictly distinct (no duplicate keys)
    const uniqueIds = new Set(memberIds);
    assert.strictEqual(uniqueIds.size, 10);

    // Assert sequences cover 1 through 10
    const sortedSeqs = [...memberSeqs].sort((a, b) => a - b);
    assert.deepStrictEqual(sortedSeqs, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Assert organization counter advanced correctly to 11
    const refreshedOrg = await Organization.findById(org._id);
    assert.strictEqual(refreshedOrg.nextMemberSeq, 11);
  });

  it("4. Stable IDs after name, email, and role changes", async () => {
    const org = await Organization.create({ name: "Stable Org", code: "STBL" });
    const user = await User.create({ name: "Original Name", email: "orig@stable.com", password: "Password123!" });

    const membership = await OrganizationMembership.create({
      user: user._id,
      organization: org._id,
      role: "rep",
      status: "active",
    });

    const originalMemberId = membership.memberId;
    assert.strictEqual(originalMemberId, "STBL-001");

    // Change user name and email
    user.name = "Updated Name";
    user.email = "updated@stable.com";
    await user.save();

    // Change membership role
    membership.role = "manager";
    await membership.save();

    const refreshed = await OrganizationMembership.findById(membership._id);
    assert.strictEqual(refreshed.memberId, originalMemberId);
    assert.strictEqual(refreshed.memberSeq, 1);
  });

  it("5. Removed-member IDs are never reused", async () => {
    const org = await Organization.create({ name: "Retention Org", code: "RETN" });
    const user1 = await User.create({ name: "User 1", email: "u1@retn.com", password: "Password123!" });
    const user2 = await User.create({ name: "User 2", email: "u2@retn.com", password: "Password123!" });
    const user3 = await User.create({ name: "User 3", email: "u3@retn.com", password: "Password123!" });

    const m1 = await OrganizationMembership.create({ user: user1._id, organization: org._id, role: "owner", status: "active" });
    const m2 = await OrganizationMembership.create({ user: user2._id, organization: org._id, role: "rep", status: "active" });
    assert.strictEqual(m2.memberId, "RETN-002");

    // Remove m2 (simulate deletion / removal)
    await OrganizationMembership.findByIdAndDelete(m2._id);

    // Create user 3 membership
    const m3 = await OrganizationMembership.create({ user: user3._id, organization: org._id, role: "rep", status: "active" });

    // RETN-002 must NEVER be reused; m3 must be RETN-003
    assert.strictEqual(m3.memberId, "RETN-003");
  });

  it("6. Safe, idempotent backfill of existing memberships", async () => {
    const org = await Organization.create({ name: "Legacy Corp" }); // No code specified initially
    const user1 = await User.create({ name: "Legacy 1", email: "l1@leg.com", password: "Password123!" });
    const user2 = await User.create({ name: "Legacy 2", email: "l2@leg.com", password: "Password123!" });

    // Insert memberships bypassing pre-validate hook to simulate legacy unmigrated data
    await OrganizationMembership.collection.insertOne({
      user: user1._id,
      organization: org._id,
      role: "owner",
      status: "active",
      createdAt: new Date("2026-01-01"),
    });
    await OrganizationMembership.collection.insertOne({
      user: user2._id,
      organization: org._id,
      role: "rep",
      status: "active",
      createdAt: new Date("2026-01-02"),
    });

    // 1. Run Dry-run
    const dryRunRes = await runMemberIdBackfill({ dryRun: true });
    assert.strictEqual(dryRunRes.dryRun, true);
    assert.strictEqual(dryRunRes.membershipsAssigned, 2);

    // Confirm DB was untouched by dryRun
    const untouched = await OrganizationMembership.find({ organization: org._id });
    assert.strictEqual(untouched.every((m) => !m.memberId), true);

    // 2. Execute Backfill
    const execRes = await runMemberIdBackfill({ dryRun: false });
    assert.strictEqual(execRes.dryRun, false);
    assert.strictEqual(execRes.membershipsAssigned, 2);

    const migrated = await OrganizationMembership.find({ organization: org._id }).sort({ createdAt: 1 });
    assert.ok(migrated[0].memberId);
    assert.ok(migrated[1].memberId);
    assert.strictEqual(migrated[0].memberSeq, 1);
    assert.strictEqual(migrated[1].memberSeq, 2);

    // 3. Re-run Backfill (Idempotency check)
    const rerunRes = await runMemberIdBackfill({ dryRun: false });
    assert.strictEqual(rerunRes.membershipsAssigned, 0);
    assert.strictEqual(rerunRes.membershipsPreserved, 2);

    // IDs remain intact
    const postRerun = await OrganizationMembership.find({ organization: org._id }).sort({ createdAt: 1 });
    assert.strictEqual(postRerun[0].memberId, migrated[0].memberId);
    assert.strictEqual(postRerun[1].memberId, migrated[1].memberId);
  });

  it("7. Organization counter correctness and collision handling", async () => {
    const org = await Organization.create({ name: "Counter Org", code: "CNTR", nextMemberSeq: 5 });
    const user = await User.create({ name: "Late Joiner", email: "late@cntr.com", password: "Password123!" });

    const m = await OrganizationMembership.create({ user: user._id, organization: org._id, role: "rep", status: "active" });

    // Counter was 5, so this member gets sequence 5
    assert.strictEqual(m.memberSeq, 5);
    assert.strictEqual(m.memberId, "CNTR-005");

    const refreshed = await Organization.findById(org._id);
    assert.strictEqual(refreshed.nextMemberSeq, 6);
  });

  it("8. Separate Member IDs for the same person in different organizations", async () => {
    const orgA = await Organization.create({ name: "Org Alpha", code: "ORGA" });
    const orgB = await Organization.create({ name: "Org Beta", code: "ORGB" });

    const user = await User.create({ name: "Consultant Bob", email: "bob@consulting.com", password: "Password123!" });

    const mA = await OrganizationMembership.create({ user: user._id, organization: orgA._id, role: "rep", status: "active" });
    const mB = await OrganizationMembership.create({ user: user._id, organization: orgB._id, role: "rep", status: "active" });

    assert.strictEqual(mA.memberId, "ORGA-001");
    assert.strictEqual(mB.memberId, "ORGB-001");
    assert.notStrictEqual(mA.memberId, mB.memberId);
  });

  it("9. Duplicate organization-code handling", async () => {
    await Organization.create({ name: "Apex Technologies", code: "APEX" });

    // Attempt to generate unique code for another org with same candidate
    const code2 = await generateUniqueOrgCode("Apex Logistics");
    assert.notStrictEqual(code2, "APEX");
    assert.ok(code2.startsWith("APEX"));
  });

  it("10. Chat teammate search by exact Member ID", async () => {
    const org = await Organization.create({ name: "Chat Search Org", code: "CSO" });
    const userA = await User.create({ name: "Alice", email: "a@cso.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@cso.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    const mB = await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    // Search by exact Member ID "CSO-002"
    const searchRes = await makeRequest("GET", `/api/chat/teammates?q=${mB.memberId}`, null, tokenA, org._id);
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.data.teammates.length, 1);
    assert.strictEqual(searchRes.data.teammates[0].email, "b@cso.com");
    assert.strictEqual(searchRes.data.teammates[0].memberId, mB.memberId);
  });

  it("11. Cross-organization Member ID lookup isolation", async () => {
    const org1 = await Organization.create({ name: "Org 1", code: "ORG1" });
    const org2 = await Organization.create({ name: "Org 2", code: "ORG2" });

    const u1 = await User.create({ name: "User 1", email: "u1@org1.com", password: "Password123!" });
    const u2 = await User.create({ name: "User 2", email: "u2@org2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: u1._id, organization: org1._id, role: "owner", status: "active" });
    const m2 = await OrganizationMembership.create({ user: u2._id, organization: org2._id, role: "owner", status: "active" });

    const token1 = jwt.sign({ id: u1._id, tv: 0 }, JWT_SECRET);

    // User in Org 1 searches for Org 2's member ID -> 0 results (Tenant isolation strictly enforced)
    const searchRes = await makeRequest("GET", `/api/chat/teammates?q=${m2.memberId}`, null, token1, org1._id);
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.data.teammates.length, 0);
  });

  it("12. Audit-log display of Member IDs without leaking protected information", async () => {
    const org = await Organization.create({ name: "Audit Org", code: "AUDT" });
    const user = await User.create({ name: "Auditor", email: "auditor@audt.com", password: "Password123!" });

    const m = await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });
    const token = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);

    // Create an audit activity log entry
    await ActivityLog.create({
      organization: org._id,
      user: user._id,
      action: "LEAD_CREATED",
      entityType: "Lead",
      entityId: new mongoose.Types.ObjectId(),
      details: { leadName: "Test Lead", password: "sensitive_secret_to_strip" },
    });

    const auditRes = await makeRequest("GET", "/api/organization/audit-logs", null, token, org._id);
    assert.strictEqual(auditRes.status, 200);
    assert.strictEqual(auditRes.data.data.length, 1);

    const entry = auditRes.data.data[0];
    assert.strictEqual(entry.user.memberId, m.memberId);
    assert.strictEqual(entry.user.memberId, "AUDT-001");
    // Confirm sensitive fields were stripped
    assert.strictEqual(entry.details.password, undefined);
  });
});

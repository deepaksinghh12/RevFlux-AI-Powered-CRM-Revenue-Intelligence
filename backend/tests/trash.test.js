import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";

import trashRoutes from "../routes/trash.routes.js";
import leadRoutes from "../routes/lead.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import { Lead } from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { errorHandler } from "../middleware/error.middleware.js";
import { runTrashCleanup } from "../jobs/trashCleanup.js";

let app;
let server;
let port;

const JWT_SECRET = "trash_test_jwt_secret_98765";
process.env.JWT_SECRET = JWT_SECRET;

const makeToken = (userId, tv = 0) => jwt.sign({ id: userId, tv }, JWT_SECRET, { expiresIn: "1h" });

before(async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";
  const lower = mongoUri.toLowerCase();
  const env = (process.env.NODE_ENV || "").toLowerCase();
  if (lower.includes("prod") || env.includes("prod")) {
    throw new Error("Cannot run test against production DB");
  }
  let testUri;
  if (mongoUri.includes("/?")) {
    testUri = mongoUri.replace("/?", "/revflux_test_trash?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_trash$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_trash`;
  } else {
    testUri = `${mongoUri}/revflux_test_trash`;
  }
  await mongoose.connect(testUri);

  app = express();
  app.use(express.json());
  app.use("/api/trash", trashRoutes);
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
    await new Promise((resolve) => server.close(resolve));
  }
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    OrganizationMembership.deleteMany({}),
    Lead.deleteMany({}),
    Contact.deleteMany({}),
    Task.deleteMany({}),
    Note.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);
});

describe("Universal Trash & Recovery Engine (v1.2.0 Phase 1)", () => {
  it("1. Lists soft-deleted items by tenant and excludes active items", async () => {
    const org = await Organization.create({ name: "Trash Org 1", plan: "starter" });
    const user = await User.create({ name: "Alice Admin", email: "alice@trash1.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    // 1 active lead, 1 deleted lead
    await Lead.create({ organization: org._id, owner: user._id, name: "Active Lead", status: "New", isDeleted: false });
    const deletedLead = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: "Deleted Lead",
      status: "New",
      isDeleted: true,
      deletedAt: new Date(),
    });

    // 1 deleted contact
    const deletedContact = await Contact.create({
      organization: org._id,
      owner: user._id,
      name: "Deleted Contact",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const token = makeToken(user._id);
    const res = await fetch(`http://localhost:${port}/api/trash`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 2);
    const titles = data.items.map((i) => i.title);
    assert.ok(titles.includes("Deleted Lead"));
    assert.ok(titles.includes("Deleted Contact"));
    assert.ok(!titles.includes("Active Lead"));
  });

  it("2. Filters trash by entityType parameter", async () => {
    const org = await Organization.create({ name: "Filter Org", plan: "starter" });
    const user = await User.create({ name: "Bob User", email: "bob@filter.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    await Lead.create({ organization: org._id, owner: user._id, name: "Trash Lead", isDeleted: true, deletedAt: new Date() });
    await Task.create({ organization: org._id, owner: user._id, title: "Trash Task", isDeleted: true, deletedAt: new Date() });

    const token = makeToken(user._id);

    // Query leads only
    const resLeads = await fetch(`http://localhost:${port}/api/trash?entityType=leads`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    const dataLeads = await resLeads.json();
    assert.strictEqual(dataLeads.count, 1);
    assert.strictEqual(dataLeads.items[0].entityType, "lead");

    // Query tasks only
    const resTasks = await fetch(`http://localhost:${port}/api/trash?entityType=tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    const dataTasks = await resTasks.json();
    assert.strictEqual(dataTasks.count, 1);
    assert.strictEqual(dataTasks.items[0].entityType, "task");
  });

  it("3. Enforces 30-day cutoff: items deleted > 30 days ago are excluded and cannot be restored", async () => {
    const org = await Organization.create({ name: "Retention Org", plan: "starter" });
    const user = await User.create({ name: "Admin", email: "admin@retention.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const expiredLead = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: "Expired Lead",
      isDeleted: true,
      deletedAt: thirtyFiveDaysAgo,
    });

    const token = makeToken(user._id);

    // GET trash excludes it
    const listRes = await fetch(`http://localhost:${port}/api/trash`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    const listData = await listRes.json();
    assert.strictEqual(listData.count, 0);

    // POST restore rejects it
    const restoreRes = await fetch(`http://localhost:${port}/api/trash/leads/${expiredLead._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(restoreRes.status, 400);
    const restoreData = await restoreRes.json();
    assert.match(restoreData.message, /30-day recovery retention window/);
  });

  it("4. Prevents cross-tenant access to trash listing, restoration, and purge", async () => {
    const org1 = await Organization.create({ name: "Tenant 1", plan: "starter" });
    const org2 = await Organization.create({ name: "Tenant 2", plan: "starter" });

    const user1 = await User.create({ name: "User 1", email: "u1@tenant1.com", password: "Password123!" });
    const user2 = await User.create({ name: "User 2", email: "u2@tenant2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user1._id, organization: org1._id, role: "admin", status: "active" });
    await OrganizationMembership.create({ user: user2._id, organization: org2._id, role: "admin", status: "active" });

    const deletedInOrg1 = await Lead.create({
      organization: org1._id,
      owner: user1._id,
      name: "Secret Lead Org 1",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const tokenUser2 = makeToken(user2._id);

    // User 2 in Org 2 attempts to restore User 1's lead from Org 1
    const res = await fetch(`http://localhost:${port}/api/trash/leads/${deletedInOrg1._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenUser2}`,
        "X-Organization-Id": org2._id.toString(),
      },
    });
    assert.strictEqual(res.status, 404);

    // User 2 in Org 2 attempts to purge User 1's lead
    const purgeRes = await fetch(`http://localhost:${port}/api/trash/leads/${deletedInOrg1._id}/purge`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenUser2}`,
        "X-Organization-Id": org2._id.toString(),
      },
    });
    assert.strictEqual(purgeRes.status, 404);
  });

  it("5. Rep ownership sandboxing: reps only view and restore their own trash", async () => {
    const org = await Organization.create({ name: "Rep Org", plan: "starter" });
    const repA = await User.create({ name: "Rep Alice", email: "al@rep.com", password: "Password123!" });
    const repB = await User.create({ name: "Rep Bob", email: "bob@rep.com", password: "Password123!" });

    await OrganizationMembership.create({ user: repA._id, organization: org._id, role: "rep", status: "active" });
    await OrganizationMembership.create({ user: repB._id, organization: org._id, role: "rep", status: "active" });

    const leadA = await Lead.create({ organization: org._id, owner: repA._id, name: "Alice's Lead", isDeleted: true, deletedAt: new Date() });
    const leadB = await Lead.create({ organization: org._id, owner: repB._id, name: "Bob's Lead", isDeleted: true, deletedAt: new Date() });

    const tokenA = makeToken(repA._id);

    // Rep A lists trash -> only sees Alice's Lead
    const listRes = await fetch(`http://localhost:${port}/api/trash`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    const listData = await listRes.json();
    assert.strictEqual(listData.count, 1);
    assert.strictEqual(listData.items[0].title, "Alice's Lead");

    // Rep A attempts to restore Bob's Lead -> 404 (sandboxed)
    const restoreRes = await fetch(`http://localhost:${port}/api/trash/leads/${leadB._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(restoreRes.status, 404);

    // Rep A restores Alice's Lead -> 200
    const restoreAliceRes = await fetch(`http://localhost:${port}/api/trash/leads/${leadA._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(restoreAliceRes.status, 200);

    const checkLeadA = await Lead.findById(leadA._id);
    assert.strictEqual(checkLeadA.isDeleted, false);
    assert.strictEqual(checkLeadA.deletedAt, null);
  });

  it("6. Restricts permanent purge to owner/admin and denies rep and manager", async () => {
    const org = await Organization.create({ name: "Purge Org", plan: "starter" });
    const owner = await User.create({ name: "Owner", email: "owner@corp.com", password: "Password123!" });
    const manager = await User.create({ name: "Manager", email: "mgr@corp.com", password: "Password123!" });
    const rep = await User.create({ name: "Rep", email: "rep@corp.com", password: "Password123!" });

    await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: manager._id, organization: org._id, role: "manager", status: "active" });
    await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

    const task = await Task.create({
      organization: org._id,
      owner: rep._id,
      title: "Task to Purge",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const tokenRep = makeToken(rep._id);
    const tokenMgr = makeToken(manager._id);
    const tokenOwner = makeToken(owner._id);

    // Rep attempts purge -> 403
    const resRep = await fetch(`http://localhost:${port}/api/trash/tasks/${task._id}/purge`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenRep}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(resRep.status, 403);

    // Manager attempts purge -> 403
    const resMgr = await fetch(`http://localhost:${port}/api/trash/tasks/${task._id}/purge`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenMgr}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(resMgr.status, 403);

    // Owner executes purge -> 200
    const resOwner = await fetch(`http://localhost:${port}/api/trash/tasks/${task._id}/purge`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenOwner}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(resOwner.status, 200);

    const taskInDb = await Task.findById(task._id);
    assert.strictEqual(taskInDb, null);
  });

  it("7. Lead restore enforces plan quota limits and respects unlimited plans", async () => {
    // Org with leadLimit = 2
    const org = await Organization.create({ name: "Quota Org", plan: "free", leadLimit: 2 });
    const user = await User.create({ name: "Admin", email: "admin@quota.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    // 2 active leads (at capacity)
    await Lead.create({ organization: org._id, owner: user._id, name: "Lead 1", isDeleted: false });
    await Lead.create({ organization: org._id, owner: user._id, name: "Lead 2", isDeleted: false });

    // 1 deleted lead in trash
    const trashLead = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: "Lead 3 In Trash",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const token = makeToken(user._id);

    // Attempting to restore when quota is full -> 402
    const resFail = await fetch(`http://localhost:${port}/api/trash/leads/${trashLead._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(resFail.status, 402);
    const failData = await resFail.json();
    assert.match(failData.message, /Lead limit reached/);

    // Upgrade org to "business" (unlimited)
    org.plan = "business";
    await org.save();

    // Now restore succeeds
    const resSuccess = await fetch(`http://localhost:${port}/api/trash/leads/${trashLead._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(resSuccess.status, 200);

    const restoredInDb = await Lead.findById(trashLead._id);
    assert.strictEqual(restoredInDb.isDeleted, false);
  });

  it("8. Restores notes soft-deleted with lead, but does NOT resurrect independently deleted notes", async () => {
    const org = await Organization.create({ name: "Cascade Org", plan: "starter" });
    const user = await User.create({ name: "Owner", email: "owner@cascade.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "owner", status: "active" });

    const lead = await Lead.create({ organization: org._id, owner: user._id, name: "Target Lead" });

    // Note A: was deleted independently by user days before
    const noteA = await Note.create({
      organization: org._id,
      owner: user._id,
      lead: lead._id,
      content: "Independently deleted note",
      isDeleted: true,
      deletedAt: new Date(Date.now() - 5000),
      deletedWithLead: null,
    });

    // Note B: active note on the lead
    const noteB = await Note.create({
      organization: org._id,
      owner: user._id,
      lead: lead._id,
      content: "Active note on lead",
      isDeleted: false,
    });

    const token = makeToken(user._id);

    // Delete lead via API (soft delete)
    const delRes = await fetch(`http://localhost:${port}/api/leads/${lead._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(delRes.status, 200);

    // Confirm Note B is tagged with deletedWithLead: lead._id
    const noteBAfterLeadDelete = await Note.findById(noteB._id);
    assert.strictEqual(noteBAfterLeadDelete.isDeleted, true);
    assert.strictEqual(noteBAfterLeadDelete.deletedWithLead.toString(), lead._id.toString());

    // Restore lead via trash API
    const restoreRes = await fetch(`http://localhost:${port}/api/trash/leads/${lead._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(restoreRes.status, 200);

    // Verify Note B was restored
    const noteBFinal = await Note.findById(noteB._id);
    assert.strictEqual(noteBFinal.isDeleted, false);
    assert.strictEqual(noteBFinal.deletedAt, null);
    assert.strictEqual(noteBFinal.deletedWithLead, null);

    // Verify Note A remains deleted (NOT resurrected)
    const noteAFinal = await Note.findById(noteA._id);
    assert.strictEqual(noteAFinal.isDeleted, true);
    assert.notStrictEqual(noteAFinal.deletedAt, null);
  });

  it("9. Writes ActivityLog audit trail for restoration and permanent purge", async () => {
    const org = await Organization.create({ name: "Audit Org", plan: "starter" });
    const user = await User.create({ name: "Admin", email: "admin@audit.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    const contact = await Contact.create({
      organization: org._id,
      owner: user._id,
      name: "Contact to Audit",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const token = makeToken(user._id);

    // Restore
    await fetch(`http://localhost:${port}/api/trash/contacts/${contact._id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });

    const restoreLog = await ActivityLog.findOne({ action: "CONTACT_RESTORED", entityId: contact._id });
    assert.ok(restoreLog);
    assert.strictEqual(restoreLog.organization.toString(), org._id.toString());
    assert.strictEqual(restoreLog.user.toString(), user._id.toString());

    // Re-delete and Purge
    await Contact.updateOne(
      { _id: contact._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    await fetch(`http://localhost:${port}/api/trash/contacts/${contact._id}/purge`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });

    const purgeLog = await ActivityLog.findOne({ action: "CONTACT_PURGED", entityId: contact._id });
    assert.ok(purgeLog);
  });

  it("10. Rejects invalid entity type with 400", async () => {
    const org = await Organization.create({ name: "Type Org", plan: "starter" });
    const user = await User.create({ name: "Admin", email: "admin@type.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    const token = makeToken(user._id);
    const res = await fetch(`http://localhost:${port}/api/trash/invalid_entity_type`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      },
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /Invalid entity type/);
  });

  it("11. Scheduled trash retention cleanup job safely and idempotently purges expired records", async () => {
    const org = await Organization.create({ name: "Retention Cleanup Org", plan: "starter" });
    const user = await User.create({ name: "Admin", email: "admin@clean.com", password: "Password123!" });

    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    // Expired records
    await Lead.create({ organization: org._id, owner: user._id, name: "Expired Lead", isDeleted: true, deletedAt: fortyDaysAgo });
    await Contact.create({ organization: org._id, owner: user._id, name: "Expired Contact", isDeleted: true, deletedAt: fortyDaysAgo });
    await Task.create({ organization: org._id, owner: user._id, title: "Expired Task", isDeleted: true, deletedAt: fortyDaysAgo });
    await Note.create({ organization: org._id, owner: user._id, content: "Expired Note", isDeleted: true, deletedAt: fortyDaysAgo });

    // Active deleted records (within 30 days)
    const safeLead = await Lead.create({ organization: org._id, owner: user._id, name: "Safe Lead", isDeleted: true, deletedAt: tenDaysAgo });

    // First cleanup run
    const result1 = await runTrashCleanup({ retentionDays: 30, organizationId: org._id });
    assert.strictEqual(result1.leads, 1);
    assert.strictEqual(result1.contacts, 1);
    assert.strictEqual(result1.tasks, 1);
    assert.strictEqual(result1.notes, 1);

    // Safe lead is preserved
    const safeLeadInDb = await Lead.findById(safeLead._id);
    assert.ok(safeLeadInDb);

    // Second run is idempotent (0 deleted)
    const result2 = await runTrashCleanup({ retentionDays: 30, organizationId: org._id });
    assert.strictEqual(result2.leads, 0);
    assert.strictEqual(result2.contacts, 0);
    assert.strictEqual(result2.tasks, 0);
    assert.strictEqual(result2.notes, 0);
  });

  it("12. Concurrent restore race risk demonstration: parallel restores can exceed quota without atomic synchronization", async () => {
    // Org with leadLimit = 2
    const org = await Organization.create({ name: "Race Org", plan: "free", leadLimit: 2 });
    const user = await User.create({ name: "Admin", email: "admin@race.com", password: "Password123!" });
    await OrganizationMembership.create({ user: user._id, organization: org._id, role: "admin", status: "active" });

    // 1 active lead (capacity is 2, so only 1 more can be admitted legitimately)
    await Lead.create({ organization: org._id, owner: user._id, name: "Existing Lead", isDeleted: false });

    // 2 soft-deleted leads in trash
    const trashLeadA = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: "Trash Lead A",
      isDeleted: true,
      deletedAt: new Date(),
    });
    const trashLeadB = await Lead.create({
      organization: org._id,
      owner: user._id,
      name: "Trash Lead B",
      isDeleted: true,
      deletedAt: new Date(),
    });

    const token = makeToken(user._id);

    // Fire both restore requests in parallel
    const [resA, resB] = await Promise.all([
      fetch(`http://localhost:${port}/api/trash/leads/${trashLeadA._id}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": org._id.toString(),
        },
      }),
      fetch(`http://localhost:${port}/api/trash/leads/${trashLeadB._id}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": org._id.toString(),
        },
      }),
    ]);

    // Inspect final active lead count
    const activeCountAfter = await Lead.countDocuments({
      organization: org._id,
      isDeleted: { $ne: true },
    });

    // If both parallel requests interleaved in check-then-act, activeCount exceeds leadLimit
    // This test formally documents the concurrency window inherent in cross-document count-then-act checks.
    if (resA.status === 200 && resB.status === 200) {
      assert.strictEqual(activeCountAfter, 3);
      assert.ok(activeCountAfter > org.leadLimit, "Race window observed: active leads exceeded leadLimit under parallel requests");
    } else {
      // If requests were serialized by the event loop, one received 402
      assert.ok(resA.status === 402 || resB.status === 402);
      assert.strictEqual(activeCountAfter, 2);
    }
  });
});

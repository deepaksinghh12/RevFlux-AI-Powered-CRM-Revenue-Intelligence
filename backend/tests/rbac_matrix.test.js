import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { io as ClientIO } from "../../frontend/node_modules/socket.io-client/build/esm/index.js";

import authRoutes from "../routes/auth.routes.js";
import leadRoutes from "../routes/lead.routes.js";
import contactRoutes from "../routes/contact.routes.js";
import taskRoutes from "../routes/task.routes.js";
import noteRoutes from "../routes/note.routes.js";
import outreachRoutes from "../routes/outreach.routes.js";
import analyticsRoutes from "../routes/analytics.routes.js";
import teamRoutes from "../routes/team.routes.js";
import organizationRoutes from "../routes/organization.routes.js";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import Lead from "../models/Lead.js";
import { Contact } from "../models/Contact.js";
import { Task } from "../models/Task.js";
import { Note } from "../models/Note.js";
import { ActivityLog } from "../models/ActivityLog.js";

import { initSocket } from "../utils/socket.js";
import { executeTool } from "../services/aiTools.service.js";
import { errorHandler } from "../middleware/error.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";

let app;
let httpServer;
let io;
let port;

const JWT_SECRET = "matrix_rbac_qa_test_secret";
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
    testUri = mongoUri.replace("/?", "/revflux_test_rbac_matrix?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_rbac_matrix$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_rbac_matrix`;
  } else {
    testUri = `${mongoUri}/revflux_test_rbac_matrix`;
  }
  if (!testUri.includes("/revflux_test_rbac_matrix") || testUri === mongoUri) {
    throw new Error("Test URI isolation failed");
  }
  await mongoose.connect(testUri);

  app = express();
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notes", noteRoutes);
  app.use("/api/outreach", outreachRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/organization", organizationRoutes);
  app.use(errorHandler);

  httpServer = createServer(app);
  io = initSocket(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  io.close();
  httpServer.close();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const makeToken = (id, tv = 0) => jwt.sign({ id, tv }, JWT_SECRET, { expiresIn: "1h" });

const getAuthHeaders = (user, org, tokenVersion = 0) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${makeToken(user._id, tokenVersion)}`,
  "X-Organization-Id": org._id.toString(),
});

describe("RevFlux — Automated RBAC QA Matrix (7 Core Workflows)", () => {

  // =========================================================================
  // WORKFLOW A: Owner Workflow
  // =========================================================================
  describe("Workflow A: Owner Workflow", () => {
    it("should allow an owner to access team administration, invite members, modify roles & permissions, and verify persisted audit trails", async () => {
      const org = await Organization.create({ name: "Workflow A Org" });
      const owner = await User.create({ name: "Alice Owner", email: "alice.owner@corp.com", password: "password123" });
      const targetUser = await User.create({ name: "Bob Target", email: "bob.target@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      const targetMembership = await OrganizationMembership.create({
        user: targetUser._id,
        organization: org._id,
        role: "rep",
        status: "active",
      });

      const ownerHeaders = getAuthHeaders(owner, org);

      // 1. Access team administration
      const teamRes = await fetch(`http://localhost:${port}/api/team`, { headers: ownerHeaders });
      assert.strictEqual(teamRes.status, 200);
      const teamData = await teamRes.json();
      assert.strictEqual(teamData.success, true);
      assert.strictEqual(teamData.members.length, 2);

      // 2. Invite a new member
      const inviteRes = await fetch(`http://localhost:${port}/api/team/invite`, {
        method: "POST",
        headers: ownerHeaders,
        body: JSON.stringify({ email: "charlie.new@corp.com", role: "rep", name: "Charlie New" }),
      });
      assert.strictEqual(inviteRes.status, 201);
      const inviteData = await inviteRes.json();
      assert.strictEqual(inviteData.success, true);

      // Confirm persisted membership in DB
      const invitedMember = await OrganizationMembership.findOne({
        organization: org._id,
        inviteEmail: "charlie.new@corp.com",
      });
      assert.ok(invitedMember, "Invited member record must be persisted in database");
      assert.strictEqual(invitedMember.status, "invited");
      assert.strictEqual(invitedMember.role, "rep");

      // 3. Change a member's role across hierarchy (e.g. rep -> manager)
      const roleRes = await fetch(`http://localhost:${port}/api/team/${targetUser._id}/role`, {
        method: "PUT",
        headers: ownerHeaders,
        body: JSON.stringify({ role: "manager" }),
      });
      assert.strictEqual(roleRes.status, 200);

      // Confirm persisted role in DB
      const updatedTarget = await OrganizationMembership.findById(targetMembership._id);
      assert.strictEqual(updatedTarget.role, "manager", "Target membership role must be updated to manager in database");

      // 4. Grant and modify custom permissions
      const permRes = await fetch(`http://localhost:${port}/api/team/${targetUser._id}/permissions`, {
        method: "PUT",
        headers: ownerHeaders,
        body: JSON.stringify({
          customPermissions: [
            { permission: PERMISSIONS.LEADS_ASSIGN, granted: true },
            { permission: PERMISSIONS.LEADS_DELETE, granted: false }, // Explicit deny
          ],
        }),
      });
      assert.strictEqual(permRes.status, 200);

      // Confirm persisted custom permissions in DB
      const permTarget = await OrganizationMembership.findById(targetMembership._id);
      assert.strictEqual(permTarget.customPermissions.length, 2);
      const assignPerm = permTarget.customPermissions.find((p) => p.permission === PERMISSIONS.LEADS_ASSIGN);
      const deletePerm = permTarget.customPermissions.find((p) => p.permission === PERMISSIONS.LEADS_DELETE);
      assert.strictEqual(assignPerm.granted, true);
      assert.strictEqual(deletePerm.granted, false);

      // 5. Retrieve resulting audit history and assert structure
      const auditRes = await fetch(`http://localhost:${port}/api/organization/audit-logs`, { headers: ownerHeaders });
      assert.strictEqual(auditRes.status, 200);
      const auditData = await auditRes.json();
      assert.strictEqual(auditData.success, true);
      assert.ok(auditData.data.length >= 2, "Expected audit entries for role change and permissions update");

      // Confirm audit entries have correct actor, target, action, and timestamp
      const roleLog = auditData.data.find((l) => l.action === "MEMBER_ROLE_CHANGED");
      assert.ok(roleLog, "MEMBER_ROLE_CHANGED audit log must exist");
      assert.strictEqual(roleLog.user.id.toString(), owner._id.toString());
      assert.strictEqual(roleLog.details.targetUserId, targetUser._id.toString());
      assert.strictEqual(roleLog.details.newRole, "manager");
      assert.ok(roleLog.createdAt, "Audit log must contain a valid timestamp");

      const permLog = auditData.data.find((l) => l.action === "MEMBER_PERMISSIONS_CHANGED");
      assert.ok(permLog, "MEMBER_PERMISSIONS_CHANGED audit log must exist");
      assert.strictEqual(permLog.details.targetUserId, targetUser._id.toString());
    });
  });

  // =========================================================================
  // WORKFLOW B: Admin Boundaries
  // =========================================================================
  describe("Workflow B: Admin Boundaries", () => {
    it("should allow admin to perform permitted team actions but prevent privilege escalation, owner suspension, and unauthorized deletion", async () => {
      const org = await Organization.create({ name: "Workflow B Org" });
      const owner = await User.create({ name: "Owner Dave", email: "dave.owner@corp.com", password: "password123" });
      const admin = await User.create({ name: "Admin Eve", email: "eve.admin@corp.com", password: "password123" });
      const rep = await User.create({ name: "Rep Frank", email: "frank.rep@corp.com", password: "password123" });

      const ownerMembership = await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      const adminMembership = await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });
      const repMembership = await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

      const adminHeaders = getAuthHeaders(admin, org);

      // 1. Permitted action: Admin can invite a member
      const inviteRes = await fetch(`http://localhost:${port}/api/team/invite`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ email: "grace.rep@corp.com", role: "rep" }),
      });
      assert.strictEqual(inviteRes.status, 201);

      // 2. Prohibited: Admin cannot promote anyone to owner
      const promoteRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/role`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ role: "owner" }),
      });
      assert.strictEqual(promoteRes.status, 403, "Admin must be denied from promoting member to owner");

      // Verify rep's role in DB is completely unchanged
      const repAfterAttempt = await OrganizationMembership.findById(repMembership._id);
      assert.strictEqual(repAfterAttempt.role, "rep", "Rep role in DB must remain 'rep'");

      // 3. Prohibited: Admin cannot promote themselves to owner
      const selfPromoteRes = await fetch(`http://localhost:${port}/api/team/${admin._id}/role`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ role: "owner" }),
      });
      assert.strictEqual(selfPromoteRes.status, 403, "Admin must be denied from promoting themselves to owner");
      const adminAfterAttempt = await OrganizationMembership.findById(adminMembership._id);
      assert.strictEqual(adminAfterAttempt.role, "admin", "Admin role in DB must remain 'admin'");

      // 4. Prohibited: Admin cannot suspend the workspace owner
      const suspendOwnerRes = await fetch(`http://localhost:${port}/api/team/${owner._id}/status`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ status: "suspended" }),
      });
      assert.strictEqual(suspendOwnerRes.status, 400, "Must reject attempt to suspend workspace owner");
      const ownerAfterAttempt = await OrganizationMembership.findById(ownerMembership._id);
      assert.strictEqual(ownerAfterAttempt.status, "active", "Owner status in DB must remain active");

      // 5. Prohibited: Admin cannot modify owner custom permissions
      const modifyOwnerPermsRes = await fetch(`http://localhost:${port}/api/team/${owner._id}/permissions`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({
          customPermissions: [{ permission: PERMISSIONS.LEADS_DELETE, granted: false }],
        }),
      });
      assert.strictEqual(modifyOwnerPermsRes.status, 403, "Must reject admin modifying owner permissions");
      const ownerPermsAfter = await OrganizationMembership.findById(ownerMembership._id);
      assert.strictEqual(ownerPermsAfter.customPermissions.length, 0, "Owner permissions must remain untouched");

      // 6. Prohibited: Admin cannot delete/remove team members (only owner can delete)
      const removeRes = await fetch(`http://localhost:${port}/api/team/${rep._id}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      assert.strictEqual(removeRes.status, 403, "Admin must not be authorized to remove members");
      const repStillExists = await OrganizationMembership.findById(repMembership._id);
      assert.strictEqual(repStillExists.status, "active", "Rep status must not be removed or altered");

      // 7. Prohibited: Admin cannot grant permissions they do not possess (delegation boundary)
      const delegationRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/permissions`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({
          customPermissions: [{ permission: "unknown.superpower", granted: true }],
        }),
      });
      assert.strictEqual(delegationRes.status, 400, "Unknown permissions cannot be granted");
    });
  });

  // =========================================================================
  // WORKFLOW C: Manager Workflow
  // =========================================================================
  describe("Workflow C: Manager Workflow", () => {
    it("should allow manager pipeline access & lead assignment, but deny cross-org assignment, team administration, and lead deletion", async () => {
      const org1 = await Organization.create({ name: "Workflow C Org 1" });
      const org2 = await Organization.create({ name: "Workflow C Org 2" });

      const manager = await User.create({ name: "Manager Mike", email: "mike.mgr@corp.com", password: "password123" });
      const rep1 = await User.create({ name: "Rep 1", email: "rep1@corp.com", password: "password123" });
      const repForeign = await User.create({ name: "Rep Foreign", email: "foreign@other.com", password: "password123" });

      await OrganizationMembership.create({ user: manager._id, organization: org1._id, role: "manager", status: "active" });
      await OrganizationMembership.create({ user: rep1._id, organization: org1._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repForeign._id, organization: org2._id, role: "rep", status: "active" });

      const lead = await Lead.create({
        name: "Acme Deal",
        organization: org1._id,
        owner: rep1._id,
        status: "New",
      });

      const mgrHeaders = getAuthHeaders(manager, org1);

      // 1. Manager can read pipeline data & analytics
      const leadsRes = await fetch(`http://localhost:${port}/api/leads`, { headers: mgrHeaders });
      assert.strictEqual(leadsRes.status, 200);
      const leadsData = await leadsRes.json();
      assert.strictEqual(leadsData.leads.length, 1);
      assert.strictEqual(leadsData.leads[0].name, "Acme Deal");

      const analyticsRes = await fetch(`http://localhost:${port}/api/analytics/overview`, { headers: mgrHeaders });
      assert.strictEqual(analyticsRes.status, 200);

      // 2. Manager can assign leads to eligible active members in the same organization
      const assignRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: mgrHeaders,
        body: JSON.stringify({
          leadIds: [lead._id.toString()],
          targetUserId: manager._id.toString(),
        }),
      });
      assert.strictEqual(assignRes.status, 200);

      // Verify DB update
      const updatedLead = await Lead.findById(lead._id);
      assert.strictEqual(updatedLead.owner.toString(), manager._id.toString(), "Lead owner must be updated to manager in DB");

      // 3. Prohibited: Cross-organization assignment
      const crossAssignRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: mgrHeaders,
        body: JSON.stringify({
          leadIds: [lead._id.toString()],
          targetUserId: repForeign._id.toString(), // foreign org user
        }),
      });
      assert.strictEqual(crossAssignRes.status, 400, "Cross-org assignment must be rejected");

      // Verify DB record remained unchanged after failed assignment
      const leadAfterFailedAssign = await Lead.findById(lead._id);
      assert.strictEqual(leadAfterFailedAssign.owner.toString(), manager._id.toString(), "Lead owner must not change to foreign rep");

      // 4. Prohibited: Manager cannot access team administration mutations
      const inviteRes = await fetch(`http://localhost:${port}/api/team/invite`, {
        method: "POST",
        headers: mgrHeaders,
        body: JSON.stringify({ email: "new@corp.com", role: "rep" }),
      });
      assert.strictEqual(inviteRes.status, 403, "Manager cannot invite team members");

      const roleRes = await fetch(`http://localhost:${port}/api/team/${rep1._id}/role`, {
        method: "PUT",
        headers: mgrHeaders,
        body: JSON.stringify({ role: "admin" }),
      });
      assert.strictEqual(roleRes.status, 403, "Manager cannot modify member roles");

      const permRes = await fetch(`http://localhost:${port}/api/team/${rep1._id}/permissions`, {
        method: "PUT",
        headers: mgrHeaders,
        body: JSON.stringify({ customPermissions: [{ permission: PERMISSIONS.LEADS_DELETE, granted: true }] }),
      });
      assert.strictEqual(permRes.status, 403, "Manager cannot modify member custom permissions");

      // 5. Manager lacks leads.delete permission by default
      const deleteLeadRes = await fetch(`http://localhost:${port}/api/leads/${lead._id}`, {
        method: "DELETE",
        headers: mgrHeaders,
      });
      assert.strictEqual(deleteLeadRes.status, 403, "Manager cannot delete leads without leads.delete permission");

      // Verify DB record is not deleted
      const leadAfterDeleteAttempt = await Lead.findById(lead._id);
      assert.ok(leadAfterDeleteAttempt, "Lead must not be deleted in database");
      assert.strictEqual(leadAfterDeleteAttempt.isDeleted, false);
    });
  });

  // =========================================================================
  // WORKFLOW D: Rep Isolation
  // =========================================================================
  describe("Workflow D: Rep Isolation", () => {
    it("should strictly isolate rep records across peers and organizations, denying cross-rep mutations via REST and Copilot", async () => {
      const org1 = await Organization.create({ name: "Workflow D Org 1" });
      const org2 = await Organization.create({ name: "Workflow D Org 2" });

      const repA = await User.create({ name: "Rep Alice", email: "alice.rep@corp.com", password: "password123" });
      const repB = await User.create({ name: "Rep Bob", email: "bob.rep@corp.com", password: "password123" });
      const repForeign = await User.create({ name: "Rep Foreign", email: "foreign.rep@corp2.com", password: "password123" });

      await OrganizationMembership.create({ user: repA._id, organization: org1._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repB._id, organization: org1._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repForeign._id, organization: org2._id, role: "rep", status: "active" });

      const leadA = await Lead.create({ name: "Alice Lead", organization: org1._id, owner: repA._id, status: "New", value: 5000 });
      const leadB = await Lead.create({ name: "Bob Confidential Lead", organization: org1._id, owner: repB._id, status: "New", value: 15000 });
      const leadForeign = await Lead.create({ name: "Foreign Lead", organization: org2._id, owner: repForeign._id, status: "New", value: 25000 });

      const repAHeaders = getAuthHeaders(repA, org1);

      // 1. Rep A can read their own lead
      const readSelfRes = await fetch(`http://localhost:${port}/api/leads/${leadA._id}`, { headers: repAHeaders });
      assert.strictEqual(readSelfRes.status, 200);

      // 2. Rep A listing leads should only return leadA, NOT leadB or leadForeign
      const listRes = await fetch(`http://localhost:${port}/api/leads`, { headers: repAHeaders });
      assert.strictEqual(listRes.status, 200);
      const listData = await listRes.json();
      assert.strictEqual(listData.leads.length, 1);
      assert.strictEqual(listData.leads[0]._id.toString(), leadA._id.toString());

      // 3. Rep A cannot mutate Rep B's lead via REST (PUT / DELETE)
      const updateOtherRes = await fetch(`http://localhost:${port}/api/leads/${leadB._id}`, {
        method: "PUT",
        headers: repAHeaders,
        body: JSON.stringify({ name: "Tampered By Alice", value: 99999 }),
      });
      assert.ok([403, 404].includes(updateOtherRes.status), "Cross-rep lead update must be denied (403/404)");

      // Assert DB state of leadB remains untouched
      const leadBAfterPut = await Lead.findById(leadB._id);
      assert.strictEqual(leadBAfterPut.name, "Bob Confidential Lead", "Lead B name in DB must remain unchanged");
      assert.strictEqual(leadBAfterPut.value, 15000, "Lead B value in DB must remain unchanged");

      const deleteOtherRes = await fetch(`http://localhost:${port}/api/leads/${leadB._id}`, {
        method: "DELETE",
        headers: repAHeaders,
      });
      assert.ok([403, 404].includes(deleteOtherRes.status), "Cross-rep lead deletion must be denied (403/404)");

      const leadBAfterDelete = await Lead.findById(leadB._id);
      assert.strictEqual(leadBAfterDelete.isDeleted, false, "Lead B must NOT be deleted in DB");

      // 4. Rep A cannot access foreign organization lead
      const foreignRes = await fetch(`http://localhost:${port}/api/leads/${leadForeign._id}`, { headers: repAHeaders });
      assert.ok([403, 404].includes(foreignRes.status), "Foreign org lead must be denied");

      // 5. Rep A cannot assign leads without leads.assign permission
      const assignRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: repAHeaders,
        body: JSON.stringify({ leadIds: [leadA._id.toString()], targetUserId: repB._id.toString() }),
      });
      assert.strictEqual(assignRes.status, 403, "Rep without leads.assign cannot assign leads");

      // Assert leadA owner is still Rep A
      const leadAAfterAssign = await Lead.findById(leadA._id);
      assert.strictEqual(leadAAfterAssign.owner.toString(), repA._id.toString());

      // 6. Rep A cannot access protected team administration routes
      const inviteRes = await fetch(`http://localhost:${port}/api/team/invite`, {
        method: "POST",
        headers: repAHeaders,
        body: JSON.stringify({ email: "intruder@corp.com", role: "rep" }),
      });
      assert.strictEqual(inviteRes.status, 403);

      const statusRes = await fetch(`http://localhost:${port}/api/team/${repB._id}/status`, {
        method: "PUT",
        headers: repAHeaders,
        body: JSON.stringify({ status: "suspended" }),
      });
      assert.strictEqual(statusRes.status, 403);

      // 7. Rep AI Copilot tool isolation
      const contextA = {
        organizationId: org1._id.toString(),
        userId: repA._id.toString(),
        role: "rep",
      };

      // Search leads should NOT expose Bob's lead
      const searchResult = await executeTool("searchLeads", { query: "Confidential" }, contextA);
      assert.strictEqual(searchResult, "No leads found matching the query.", "Rep A Copilot search must not find Rep B's lead");

      // Attempting to mutate Bob's lead status via Copilot tool must fail
      const toolUpdateResult = await executeTool(
        "updateLeadStatus",
        { leadId: leadB._id.toString(), status: "Won" },
        contextA
      );
      assert.ok(toolUpdateResult.includes("Lead not found or permission denied"), "Copilot must deny cross-rep lead status update");

      // Verify DB record status remained "New"
      const leadBFinal = await Lead.findById(leadB._id);
      assert.strictEqual(leadBFinal.status, "New", "Lead B status must remain 'New' in database");
    });
  });

  // =========================================================================
  // WORKFLOW E: Viewer Read-Only Access
  // =========================================================================
  describe("Workflow E: Viewer Read-Only Access", () => {
    it("should permit viewer reads across resources while rejecting all mutations with zero database side-effects", async () => {
      const org = await Organization.create({ name: "Workflow E Org" });
      const owner = await User.create({ name: "Owner Victor", email: "victor.owner@corp.com", password: "password123" });
      const viewer = await User.create({ name: "Viewer Val", email: "val.viewer@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      await OrganizationMembership.create({ user: viewer._id, organization: org._id, role: "viewer", status: "active" });

      const testLead = await Lead.create({ name: "Viewer Test Lead", organization: org._id, owner: owner._id, status: "New" });
      const testContact = await Contact.create({ name: "Viewer Contact", email: "vc@corp.com", organization: org._id, owner: owner._id });
      const testTask = await Task.create({ title: "Viewer Task", organization: org._id, owner: owner._id, creator: owner._id, assignedTo: owner._id });
      const testNote = await Note.create({ content: "Viewer Note Content", organization: org._id, owner: owner._id, author: owner._id, lead: testLead._id });

      const viewerHeaders = getAuthHeaders(viewer, org);

      // 1. Route inventory - Permitted Reads
      const readEndpoints = [
        { path: "/api/leads", name: "Leads Read" },
        { path: `/api/leads/${testLead._id}`, name: "Single Lead Read" },
        { path: "/api/contacts", name: "Contacts Read" },
        { path: `/api/contacts/${testContact._id}`, name: "Single Contact Read" },
        { path: "/api/tasks", name: "Tasks Read" },
        { path: "/api/notes", name: "Notes Read" },
        { path: "/api/team", name: "Team Read" },
        { path: "/api/analytics/overview", name: "Analytics Read" },
      ];

      for (const endpoint of readEndpoints) {
        const res = await fetch(`http://localhost:${port}${endpoint.path}`, { headers: viewerHeaders });
        assert.strictEqual(res.status, 200, `Viewer should have read access to ${endpoint.name} (${endpoint.path})`);
      }

      // 2. Route inventory - Denied Mutations (HTTP 403 expected for all)
      const initialLeadCount = await Lead.countDocuments({ organization: org._id });
      const initialContactCount = await Contact.countDocuments({ organization: org._id });
      const initialTaskCount = await Task.countDocuments({ organization: org._id });
      const initialNoteCount = await Note.countDocuments({ organization: org._id });

      // Leads mutations
      const postLead = await fetch(`http://localhost:${port}/api/leads`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ name: "Hacked Lead" }),
      });
      assert.strictEqual(postLead.status, 403, "Viewer cannot create lead");

      const putLead = await fetch(`http://localhost:${port}/api/leads/${testLead._id}`, {
        method: "PUT",
        headers: viewerHeaders,
        body: JSON.stringify({ name: "Hacked Name" }),
      });
      assert.strictEqual(putLead.status, 403, "Viewer cannot update lead");

      const deleteLead = await fetch(`http://localhost:${port}/api/leads/${testLead._id}`, {
        method: "DELETE",
        headers: viewerHeaders,
      });
      assert.strictEqual(deleteLead.status, 403, "Viewer cannot delete lead");

      // Contacts mutations
      const postContact = await fetch(`http://localhost:${port}/api/contacts`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ name: "Hacked Contact", email: "hack@corp.com" }),
      });
      assert.strictEqual(postContact.status, 403, "Viewer cannot create contact");

      const putContact = await fetch(`http://localhost:${port}/api/contacts/${testContact._id}`, {
        method: "PUT",
        headers: viewerHeaders,
        body: JSON.stringify({ name: "Hacked Contact Name" }),
      });
      assert.strictEqual(putContact.status, 403, "Viewer cannot update contact");

      const deleteContact = await fetch(`http://localhost:${port}/api/contacts/${testContact._id}`, {
        method: "DELETE",
        headers: viewerHeaders,
      });
      assert.strictEqual(deleteContact.status, 403, "Viewer cannot delete contact");

      // Tasks mutations
      const postTask = await fetch(`http://localhost:${port}/api/tasks`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ title: "Hacked Task" }),
      });
      assert.strictEqual(postTask.status, 403, "Viewer cannot create task");

      const putTask = await fetch(`http://localhost:${port}/api/tasks/${testTask._id}`, {
        method: "PUT",
        headers: viewerHeaders,
        body: JSON.stringify({ title: "Hacked Task Title" }),
      });
      assert.strictEqual(putTask.status, 403, "Viewer cannot update task");

      const deleteTask = await fetch(`http://localhost:${port}/api/tasks/${testTask._id}`, {
        method: "DELETE",
        headers: viewerHeaders,
      });
      assert.strictEqual(deleteTask.status, 403, "Viewer cannot delete task");

      // Notes mutations
      const postNote = await fetch(`http://localhost:${port}/api/notes`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ content: "Hacked Note", lead: testLead._id }),
      });
      assert.strictEqual(postNote.status, 403, "Viewer cannot create note");

      const putNote = await fetch(`http://localhost:${port}/api/notes/${testNote._id}`, {
        method: "PUT",
        headers: viewerHeaders,
        body: JSON.stringify({ content: "Hacked Note Content" }),
      });
      assert.strictEqual(putNote.status, 403, "Viewer cannot update note");

      const deleteNote = await fetch(`http://localhost:${port}/api/notes/${testNote._id}`, {
        method: "DELETE",
        headers: viewerHeaders,
      });
      assert.strictEqual(deleteNote.status, 403, "Viewer cannot delete note");

      // Outreach mutation
      const postTemplate = await fetch(`http://localhost:${port}/api/outreach/templates`, {
        method: "POST",
        headers: viewerHeaders,
        body: JSON.stringify({ name: "Hacked Template", subject: "Hi", body: "Hello" }),
      });
      assert.strictEqual(postTemplate.status, 403, "Viewer cannot create outreach template");

      // 3. Confirm ZERO database mutations occurred after all denied requests
      assert.strictEqual(await Lead.countDocuments({ organization: org._id }), initialLeadCount);
      assert.strictEqual(await Contact.countDocuments({ organization: org._id }), initialContactCount);
      assert.strictEqual(await Task.countDocuments({ organization: org._id }), initialTaskCount);
      assert.strictEqual(await Note.countDocuments({ organization: org._id }), initialNoteCount);

      const untouchedLead = await Lead.findById(testLead._id);
      assert.strictEqual(untouchedLead.name, "Viewer Test Lead");
      assert.strictEqual(untouchedLead.isDeleted, false);

      const untouchedContact = await Contact.findById(testContact._id);
      assert.strictEqual(untouchedContact.name, "Viewer Contact");

      const untouchedTask = await Task.findById(testTask._id);
      assert.strictEqual(untouchedTask.title, "Viewer Task");

      const untouchedNote = await Note.findById(testNote._id);
      assert.strictEqual(untouchedNote.content, "Viewer Note Content");
    });
  });

  // =========================================================================
  // WORKFLOW F: Realtime Permission Changes
  // =========================================================================
  describe("Workflow F: Realtime Permission Changes", () => {
    it("should emit real-time socket events on permission modification, deny API immediately on revocation, and permit on grant", async () => {
      const org1 = await Organization.create({ name: "Workflow F Org 1" });
      const org2 = await Organization.create({ name: "Workflow F Org 2" });

      const owner = await User.create({ name: "Owner Frank", email: "frank.owner@corp.com", password: "password123" });
      const rep = await User.create({ name: "Rep Rachel", email: "rachel.rep@corp.com", password: "password123" });
      const unrelatedUser = await User.create({ name: "Unrelated Ursula", email: "ursula@corp2.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org1._id, role: "owner", status: "active" });
      // Rep starts with custom grant for leads.assign
      await OrganizationMembership.create({
        user: rep._id,
        organization: org1._id,
        role: "rep",
        status: "active",
        customPermissions: [{ permission: PERMISSIONS.LEADS_ASSIGN, granted: true }],
      });
      await OrganizationMembership.create({ user: unrelatedUser._id, organization: org2._id, role: "rep", status: "active" });

      const lead1 = await Lead.create({ name: "Realtime Lead 1", organization: org1._id, owner: rep._id, status: "New" });
      const lead2 = await Lead.create({ name: "Realtime Lead 2", organization: org1._id, owner: rep._id, status: "New" });

      const repToken = makeToken(rep._id, 0);
      const unrelatedToken = makeToken(unrelatedUser._id, 0);
      const ownerHeaders = getAuthHeaders(owner, org1);

      // 1. Establish two independent Socket.IO connections
      const repSocket = ClientIO(`http://localhost:${port}`, {
        auth: { token: repToken },
        transports: ["websocket"],
      });

      const unrelatedSocket = ClientIO(`http://localhost:${port}`, {
        auth: { token: unrelatedToken },
        transports: ["websocket"],
      });

      await Promise.all([
        new Promise((resolve) => repSocket.on("connect", resolve)),
        new Promise((resolve) => unrelatedSocket.on("connect", resolve)),
      ]);

      let repReceivedEvent = null;
      let unrelatedReceivedEvent = false;

      repSocket.on("permissions:updated", (data) => {
        repReceivedEvent = data;
      });

      unrelatedSocket.on("permissions:updated", () => {
        unrelatedReceivedEvent = true;
      });

      // 2. Initial state: Rep can assign lead because leads.assign is granted
      const initialAssignRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org1._id.toString(),
        },
        body: JSON.stringify({ leadIds: [lead1._id.toString()], targetUserId: owner._id.toString() }),
      });
      assert.strictEqual(initialAssignRes.status, 200, "Initial assignment must succeed with custom grant");

      // 3. Admin/Owner revokes leads.assign (explicit deny: granted = false)
      const revokeRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/permissions`, {
        method: "PUT",
        headers: ownerHeaders,
        body: JSON.stringify({
          customPermissions: [{ permission: PERMISSIONS.LEADS_ASSIGN, granted: false }],
        }),
      });
      assert.strictEqual(revokeRes.status, 200);

      // 4. Verify target user receives permissions:updated socket notification
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.ok(repReceivedEvent, "Target rep must receive permissions:updated socket event");
      assert.strictEqual(unrelatedReceivedEvent, false, "Unrelated user in org 2 must NOT receive permission update event");

      // 5. Attempt operation again using target session -> backend MUST deny immediately (403)
      const postRevokeRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org1._id.toString(),
        },
        body: JSON.stringify({ leadIds: [lead2._id.toString()], targetUserId: owner._id.toString() }),
      });
      assert.strictEqual(postRevokeRes.status, 403, "Backend must deny operation immediately after permission revocation");

      // 6. Restore permission: Owner re-grants leads.assign
      repReceivedEvent = null;
      const regrantRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/permissions`, {
        method: "PUT",
        headers: ownerHeaders,
        body: JSON.stringify({
          customPermissions: [{ permission: PERMISSIONS.LEADS_ASSIGN, granted: true }],
        }),
      });
      assert.strictEqual(regrantRes.status, 200);

      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.ok(repReceivedEvent, "Target rep must receive permissions:updated on regrant");

      // 7. Verify newly authorized operation succeeds on rep's owned lead2
      const postRegrantRes = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org1._id.toString(),
        },
        body: JSON.stringify({ leadIds: [lead2._id.toString()], targetUserId: owner._id.toString() }),
      });
      assert.strictEqual(postRegrantRes.status, 200, "Operation must succeed after permission re-grant");

      // Verify DB reflects updated owner
      const updatedLead2 = await Lead.findById(lead2._id);
      assert.strictEqual(updatedLead2.owner.toString(), owner._id.toString(), "Lead2 owner must be updated in DB");

      // Clean up client sockets
      repSocket.disconnect();
      unrelatedSocket.disconnect();
    });
  });

  // =========================================================================
  // WORKFLOW G: Audit and Tenant Isolation
  // =========================================================================
  describe("Workflow G: Audit and Tenant Isolation", () => {
    it("should maintain multi-tenant isolation, sanitize sensitive credentials, and prevent cross-org data/audit leaks", async () => {
      const orgA = await Organization.create({ name: "Alpha Corp" });
      const orgB = await Organization.create({ name: "Beta LLC" });

      const ownerA = await User.create({ name: "Owner Alpha", email: "owner@alpha.com", password: "password123" });
      const adminA = await User.create({ name: "Admin Alpha", email: "admin@alpha.com", password: "password123" });
      const repA = await User.create({ name: "Rep Alpha", email: "rep@alpha.com", password: "password123" });

      const ownerB = await User.create({ name: "Owner Beta", email: "owner@beta.com", password: "password123" });

      await OrganizationMembership.create({ user: ownerA._id, organization: orgA._id, role: "owner", status: "active" });
      await OrganizationMembership.create({ user: adminA._id, organization: orgA._id, role: "admin", status: "active" });
      await OrganizationMembership.create({ user: repA._id, organization: orgA._id, role: "rep", status: "active" });

      await OrganizationMembership.create({ user: ownerB._id, organization: orgB._id, role: "owner", status: "active" });

      // Create leads in both orgs
      const leadA = await Lead.create({ name: "Alpha Secret Deal", organization: orgA._id, owner: ownerA._id, status: "New" });
      const leadB = await Lead.create({ name: "Beta Secret Deal", organization: orgB._id, owner: ownerB._id, status: "New" });

      // Record activity in both orgs (including sensitive fields to test sanitization)
      await ActivityLog.create({
        organization: orgA._id,
        user: ownerA._id,
        action: "LEAD_STAGE_CHANGED",
        entityType: "Lead",
        entityId: leadA._id,
        details: {
          leadName: "Alpha Secret Deal",
          password: "SuperSecretPassword123",
          token: "jwt.sensitive.token",
          apiKey: "sk-proj-xyz123",
        },
      });

      await ActivityLog.create({
        organization: orgB._id,
        user: ownerB._id,
        action: "LEAD_STAGE_CHANGED",
        entityType: "Lead",
        entityId: leadB._id,
        details: {
          leadName: "Beta Secret Deal",
        },
      });

      const ownerAHeaders = getAuthHeaders(ownerA, orgA);
      const repAHeaders = getAuthHeaders(repA, orgA);

      // 1. Audit log role restriction: Rep receives 403
      const repAuditRes = await fetch(`http://localhost:${port}/api/organization/audit-logs`, { headers: repAHeaders });
      assert.strictEqual(repAuditRes.status, 403, "Rep must be denied access to audit logs");

      // 2. Owner A can read audit logs, and only sees Org A logs
      const auditRes = await fetch(`http://localhost:${port}/api/organization/audit-logs`, { headers: ownerAHeaders });
      assert.strictEqual(auditRes.status, 200);
      const auditData = await auditRes.json();
      assert.strictEqual(auditData.success, true);

      // Verify no records from Org B are returned
      const betaLogPresent = auditData.data.some((l) => l.details && l.details.leadName === "Beta Secret Deal");
      assert.strictEqual(betaLogPresent, false, "Audit logs for Org A must NOT include Org B entries");

      // 3. Sensitive credentials sanitization check
      const alphaLog = auditData.data.find((l) => l.details && l.details.leadName === "Alpha Secret Deal");
      assert.ok(alphaLog, "Alpha log must exist");
      assert.strictEqual(alphaLog.details.password, undefined, "Password must be sanitized from audit log");
      assert.strictEqual(alphaLog.details.token, undefined, "Token must be sanitized from audit log");
      assert.strictEqual(alphaLog.details.apiKey, undefined, "API key must be sanitized from audit log");

      // 4. Cross-tenant access denial: Owner A attempts to use Org B header
      const spoofRes = await fetch(`http://localhost:${port}/api/leads`, {
        headers: {
          Authorization: `Bearer ${makeToken(ownerA._id, 0)}`,
          "X-Organization-Id": orgB._id.toString(), // Org B header with Owner A token
        },
      });
      assert.strictEqual(spoofRes.status, 403, "User cannot access workspace they do not belong to");

      // 5. Cross-tenant record access denial: Owner A attempting to access Org B lead directly
      const directLeadRes = await fetch(`http://localhost:${port}/api/leads/${leadB._id}`, { headers: ownerAHeaders });
      assert.ok([403, 404].includes(directLeadRes.status), "Owner A cannot access Org B lead");

      // 6. Denied operations do NOT write success audit records
      const initialLogCount = await ActivityLog.countDocuments({ organization: orgA._id });

      // Unauthorized action by Rep A
      const deniedRes = await fetch(`http://localhost:${port}/api/team/${adminA._id}/role`, {
        method: "PUT",
        headers: repAHeaders,
        body: JSON.stringify({ role: "owner" }),
      });
      assert.strictEqual(deniedRes.status, 403);

      const finalLogCount = await ActivityLog.countDocuments({ organization: orgA._id });
      assert.strictEqual(finalLogCount, initialLogCount, "Denied operations must not create spurious audit log entries");
    });
  });

});

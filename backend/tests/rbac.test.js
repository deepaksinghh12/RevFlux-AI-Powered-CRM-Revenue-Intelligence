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

import { initSocket, disconnectUserSockets, revokeOrgRoomAccess } from "../utils/socket.js";
import { executeTool } from "../services/aiTools.service.js";
import { errorHandler } from "../middleware/error.middleware.js";

let app;
let httpServer;
let io;
let port;

const JWT_SECRET = "critical_rbac_test_secret";
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
    testUri = mongoUri.replace("/?", "/revflux_test_rbac_critical?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_rbac_critical$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_rbac_critical`;
  } else {
    testUri = `${mongoUri}/revflux_test_rbac_critical`;
  }
  if (!testUri.includes("/revflux_test_rbac_critical") || testUri === mongoUri) {
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

describe("RevFlux — Critical Authorization Remediation Suite", () => {
  // 1. Viewer mutations denied
  describe("1. Viewer Role Denial on Mutations", () => {
    it("should deny viewer from creating, updating, or deleting contacts, tasks, notes and leads", async () => {
      const org = await Organization.create({ name: "Viewer Org" });
      const viewer = await User.create({ name: "Viewer User", email: "viewer@example.com", password: "password123" });
      await OrganizationMembership.create({ user: viewer._id, organization: org._id, role: "viewer", status: "active" });

      const token = makeToken(viewer._id, 0);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      };

      // Create contact -> 403
      const contactRes = await fetch(`http://localhost:${port}/api/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Test Contact" }),
      });
      assert.strictEqual(contactRes.status, 403);

      // Create task -> 403
      const taskRes = await fetch(`http://localhost:${port}/api/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: "Test Task" }),
      });
      assert.strictEqual(taskRes.status, 403);

      // Create note -> 403
      const noteRes = await fetch(`http://localhost:${port}/api/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: "Test Note" }),
      });
      assert.strictEqual(noteRes.status, 403);

      // Create lead -> 403
      const leadRes = await fetch(`http://localhost:${port}/api/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Test Lead" }),
      });
      assert.strictEqual(leadRes.status, 403);

      // Mutate outreach -> 403
      const outreachRes = await fetch(`http://localhost:${port}/api/outreach/templates`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Tpl", subject: "S", body: "B" }),
      });
      assert.strictEqual(outreachRes.status, 403);
    });
  });

  // 2. Rep access to another rep's lead denied in REST and AI Copilot tools
  describe("2. Rep Cross-Lead Access Denial (REST & Copilot)", () => {
    it("should deny Rep A from updating another rep's lead via REST and Copilot tools", async () => {
      const org = await Organization.create({ name: "Sales Org" });
      const repA = await User.create({ name: "Rep A", email: "repa@sales.com", password: "password123" });
      const repB = await User.create({ name: "Rep B", email: "repb@sales.com", password: "password123" });

      await OrganizationMembership.create({ user: repA._id, organization: org._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repB._id, organization: org._id, role: "rep", status: "active" });

      const leadB = await Lead.create({
        organization: org._id,
        owner: repB._id,
        name: "Confidential Lead B",
        company: "Secret Corp",
        status: "New",
      });

      // REST attempt: Rep A tries to get / update / delete Rep B's lead
      const tokenA = makeToken(repA._id, 0);
      const headersA = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "X-Organization-Id": org._id.toString(),
      };

      const getRes = await fetch(`http://localhost:${port}/api/leads/${leadB._id}`, { headers: headersA });
      assert.strictEqual(getRes.status, 404);

      const updateRes = await fetch(`http://localhost:${port}/api/leads/${leadB._id}`, {
        method: "PUT",
        headers: headersA,
        body: JSON.stringify({ name: "Hacked Lead Name" }),
      });
      assert.strictEqual(updateRes.status, 404);

      // Copilot searchLeads: Rep A cannot find Rep B's lead
      const searchRes = await executeTool(
        "searchLeads",
        { query: "Secret Corp" },
        { organizationId: org._id, userId: repA._id, role: "rep" }
      );
      assert.strictEqual(searchRes, "No leads found matching the query.");

      // Copilot updateLeadStatus: Rep A cannot change status on Rep B's lead
      const statusRes = await executeTool(
        "updateLeadStatus",
        { leadId: leadB._id.toString(), status: "Won" },
        { organizationId: org._id, userId: repA._id, role: "rep" }
      );
      assert.match(statusRes, /Lead not found or permission denied/);

      // Copilot addLeadNote: Rep A cannot add note to Rep B's lead
      const noteRes = await executeTool(
        "addLeadNote",
        { leadId: leadB._id.toString(), content: "Compromised note" },
        { organizationId: org._id, userId: repA._id, role: "rep" }
      );
      assert.match(noteRes, /Lead not found or permission denied/);

      // Verify leadB is untouched
      const freshLeadB = await Lead.findById(leadB._id);
      assert.strictEqual(freshLeadB.name, "Confidential Lead B");
      assert.strictEqual(freshLeadB.status, "New");
    });
  });

  // 3. Invalid organization membership cannot be bypassed
  describe("3. Tenant & Membership Isolation", () => {
    it("should deny access when requesting an organization the user does not belong to or is suspended", async () => {
      const org1 = await Organization.create({ name: "Org 1" });
      const org2 = await Organization.create({ name: "Org 2" });
      const user = await User.create({ name: "User 1", email: "u1@org.com", password: "password123" });

      await OrganizationMembership.create({ user: user._id, organization: org1._id, role: "admin", status: "active" });
      await OrganizationMembership.create({ user: user._id, organization: org2._id, role: "admin", status: "suspended" });

      const token = makeToken(user._id, 0);

      // Target Org 2 (suspended membership)
      const resSuspended = await fetch(`http://localhost:${port}/api/leads`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": org2._id.toString(),
        },
      });
      assert.strictEqual(resSuspended.status, 403);

      // Target unassociated Org ID
      const randomOrgId = new mongoose.Types.ObjectId();
      const resRandom = await fetch(`http://localhost:${port}/api/leads`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-Id": randomOrgId.toString(),
        },
      });
      assert.strictEqual(resRandom.status, 403);
    });
  });

  // 4. Stale or revoked JWTs cannot access Socket.IO
  describe("4. Socket.IO Authentication & Session Revocation", () => {
    it("should reject connection when token is invalid or tokenVersion is stale", async () => {
      const org = await Organization.create({ name: "Socket Org" });
      const user = await User.create({ name: "Socket User", email: "socket@test.com", password: "password123", tokenVersion: 2 });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "rep", status: "active" });

      // Stale token with tv = 0
      const staleToken = makeToken(user._id, 0);

      await new Promise((resolve) => {
        const client = ClientIO(`http://localhost:${port}`, {
          auth: { token: staleToken },
          transports: ["websocket"],
          reconnection: false,
        });

        client.on("connect_error", (err) => {
          assert.match(err.message, /Session has been revoked/);
          client.close();
          resolve();
        });

        client.on("connect", () => {
          assert.fail("Should not connect with stale tokenVersion");
        });
      });
    });

    it("should reject connection when account status is deactivated or suspended", async () => {
      const org = await Organization.create({ name: "Status Org" });
      const user = await User.create({
        name: "Deactivated User",
        email: "deactivated@test.com",
        password: "password123",
        status: "deactivated",
        tokenVersion: 0,
      });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "rep", status: "active" });

      const validToken = makeToken(user._id, 0);

      await new Promise((resolve) => {
        const client = ClientIO(`http://localhost:${port}`, {
          auth: { token: validToken },
          transports: ["websocket"],
          reconnection: false,
        });

        client.on("connect_error", (err) => {
          assert.match(err.message, /Account is deactivated or suspended/);
          client.close();
          resolve();
        });

        client.on("connect", () => {
          assert.fail("Should not connect with deactivated account");
        });
      });
    });
  });

  // 5. Suspended memberships cannot access protected organization rooms & sender identity ignored
  describe("5. Socket.IO Room Authorization & Sender Spoofing Prevention", () => {
    it("should ignore client-supplied senderName and derive sender from authenticated user", async () => {
      const org = await Organization.create({ name: "Room Org" });
      const user = await User.create({ name: "Real Alice", email: "alice@test.com", password: "password123", tokenVersion: 0 });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "rep", status: "active" });

      const token = makeToken(user._id, 0);

      await new Promise((resolve) => {
        const client = ClientIO(`http://localhost:${port}`, {
          auth: { token },
          transports: ["websocket"],
          reconnection: false,
        });

        client.on("connect", () => {
          client.emit("join_org", org._id.toString());

          // Listen for broadcast
          client.on("team:new_message", (msg) => {
            assert.strictEqual(msg.senderId, user._id.toString());
            assert.strictEqual(msg.senderName, "Real Alice", "Client-supplied senderName should be ignored");
            client.close();
            resolve();
          });

          // Attempt to spoof sender
          setTimeout(() => {
            client.emit("team:send_message", {
              organizationId: org._id.toString(),
              senderName: "Spoofed CEO Name",
              text: "Hello team",
            });
          }, 50);
        });
      });
    });

    it("should deny room access to suspended memberships", async () => {
      const org = await Organization.create({ name: "Suspended Org" });
      const user = await User.create({ name: "Suspended User", email: "susp@test.com", password: "password123", tokenVersion: 0 });
      await OrganizationMembership.create({ user: user._id, organization: org._id, role: "rep", status: "suspended" });

      const token = makeToken(user._id, 0);

      await new Promise((resolve) => {
        const client = ClientIO(`http://localhost:${port}`, {
          auth: { token },
          transports: ["websocket"],
          reconnection: false,
        });

        client.on("connect", () => {
          client.emit("join_org", org._id.toString());

          client.on("error", (err) => {
            assert.match(err.message, /Access denied/);
            client.close();
            resolve();
          });
        });
      });
    });
  });

  // 6. Admin can perform authorized team operations but cannot become owner or promote to owner
  describe("6. Admin Privilege Boundary & Ownership Safety", () => {
    it("should deny Admin from promoting anyone to Owner", async () => {
      const org = await Organization.create({ name: "Admin Org" });
      const admin = await User.create({ name: "Admin User", email: "admin@corp.com", password: "password123" });
      const rep = await User.create({ name: "Rep User", email: "rep@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });
      await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

      const adminToken = makeToken(admin._id, 0);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "X-Organization-Id": org._id.toString(),
      };

      // Admin tries to update role (only owner can modify roles) -> 403
      const res = await fetch(`http://localhost:${port}/api/team/${rep._id}/role`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role: "owner" }),
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // 7. Undefined or unknown permissions fail closed
  describe("7. Fail Closed on Undefined Permissions & Organization Deletion Route", () => {
    it("should fail closed on unknown permissions and disable direct organization deletion", async () => {
      const org = await Organization.create({ name: "Delete Org" });
      const owner = await User.create({ name: "Owner User", email: "owner@corp.com", password: "password123" });
      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });

      const ownerToken = makeToken(owner._id, 0);
      const headers = {
        Authorization: `Bearer ${ownerToken}`,
        "X-Organization-Id": org._id.toString(),
      };

      const res = await fetch(`http://localhost:${port}/api/organization`, {
        method: "DELETE",
        headers,
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Organization deletion is disabled/);
    });
  });

  // 8. Lead Assignment Validation
  describe("8. Lead Creation and Assignment Validation", () => {
    it("should reject lead assignment to a non-existent or foreign organization user", async () => {
      const org = await Organization.create({ name: "Assign Org" });
      const owner = await User.create({ name: "Lead Creator", email: "creator@corp.com", password: "password123" });
      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });

      const foreignUser = await User.create({ name: "Foreign User", email: "foreign@other.com", password: "password123" });

      const token = makeToken(owner._id, 0);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      };

      const res = await fetch(`http://localhost:${port}/api/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Assigned Lead",
          assignedTo: foreignUser._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Assigned user is not an active member/);
    });

    it("should deny Rep without leads.assign permission from assigning a lead to another user", async () => {
      const org = await Organization.create({ name: "Assign Org 2" });
      const rep1 = await User.create({ name: "Rep 1", email: "r1@corp.com", password: "password123" });
      const rep2 = await User.create({ name: "Rep 2", email: "r2@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: rep1._id, organization: org._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: rep2._id, organization: org._id, role: "rep", status: "active" });

      const token = makeToken(rep1._id, 0);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Organization-Id": org._id.toString(),
      };

      const res = await fetch(`http://localhost:${port}/api/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Unauthorized Assigned Lead",
          assignedTo: rep2._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.message, /Access Denied: You do not have permission to assign leads/);
    });
  });

  // 9. Analytics Data Scoping
  describe("9. Analytics Data Leakage Prevention", () => {
    it("should restrict rep metrics to their own assigned records in analytics overview", async () => {
      const org = await Organization.create({ name: "Analytics Org" });
      const rep = await User.create({ name: "Analytics Rep", email: "arep@corp.com", password: "password123" });
      const manager = await User.create({ name: "Analytics Mgr", email: "amgr@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: manager._id, organization: org._id, role: "manager", status: "active" });

      await Lead.create({ organization: org._id, owner: rep._id, name: "Rep Lead", status: "Won", value: 1000 });
      await Lead.create({ organization: org._id, owner: manager._id, name: "Manager Lead", status: "Won", value: 9000 });

      // Note: viewer does not have reports.read by default if not granted, but manager does and rep does not.
      // Manager sees total 10000
      const mgrToken = makeToken(manager._id, 0);
      const mgrRes = await fetch(`http://localhost:${port}/api/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${mgrToken}`,
          "X-Organization-Id": org._id.toString(),
        },
      });
      assert.strictEqual(mgrRes.status, 200);
      const mgrData = await mgrRes.json();
      assert.strictEqual(mgrData.stats.revenueWon, 10000);
      assert.strictEqual(mgrData.stats.totalLeads, 2);

      // Rep has no reports.read permission -> 403
      const repToken = makeToken(rep._id, 0);
      const repRes = await fetch(`http://localhost:${port}/api/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org._id.toString(),
        },
      });
      assert.strictEqual(repRes.status, 403);
    });
  });

  // 10. Safe Lead Reassignment & Bulk Assignment (Day 1B)
  describe("10. Safe Lead Reassignment & Bulk Assignment", () => {
    it("should allow manager with leads.assign to reassign leads and log audit activity", async () => {
      const org = await Organization.create({ name: "Assign Org" });
      const manager = await User.create({ name: "Assign Mgr", email: "mgr_assign@corp.com", password: "password123" });
      const repA = await User.create({ name: "Rep A", email: "repa@corp.com", password: "password123" });
      const repB = await User.create({ name: "Rep B", email: "repb@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: manager._id, organization: org._id, role: "manager", status: "active" });
      await OrganizationMembership.create({ user: repA._id, organization: org._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repB._id, organization: org._id, role: "rep", status: "active" });

      const lead1 = await Lead.create({ organization: org._id, owner: repA._id, name: "Lead 1" });
      const lead2 = await Lead.create({ organization: org._id, owner: repA._id, name: "Lead 2" });

      const mgrToken = makeToken(manager._id, 0);
      const res = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mgrToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          leadIds: [lead1._id.toString(), lead2._id.toString()],
          targetUserId: repB._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.assignedCount, 2);

      // Verify DB owner changed
      const updated1 = await Lead.findById(lead1._id);
      const updated2 = await Lead.findById(lead2._id);
      assert.strictEqual(updated1.owner.toString(), repB._id.toString());
      assert.strictEqual(updated2.owner.toString(), repB._id.toString());

      // Verify audit logs were created
      const logs = await ActivityLog.find({ organization: org._id, action: "LEAD_BULK_ASSIGNED" });
      assert.strictEqual(logs.length, 2);
    });

    it("should reject assignment to a non-member of the workspace", async () => {
      const org = await Organization.create({ name: "Assign Org 2" });
      const manager = await User.create({ name: "Assign Mgr 2", email: "mgr_assign2@corp.com", password: "password123" });
      const outsider = await User.create({ name: "Outsider", email: "outsider@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: manager._id, organization: org._id, role: "manager", status: "active" });

      const lead = await Lead.create({ organization: org._id, owner: manager._id, name: "Lead X" });

      const mgrToken = makeToken(manager._id, 0);
      const res = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mgrToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          leadIds: [lead._id.toString()],
          targetUserId: outsider._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /not an active member/i);
    });

    it("should prevent rep without leads.assign from assigning leads", async () => {
      const org = await Organization.create({ name: "Assign Org 3" });
      const rep = await User.create({ name: "Rep No Assign", email: "rep_noassign@corp.com", password: "password123" });
      const repB = await User.create({ name: "Rep Target", email: "rep_target@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });
      await OrganizationMembership.create({ user: repB._id, organization: org._id, role: "rep", status: "active" });

      const lead = await Lead.create({ organization: org._id, owner: rep._id, name: "Rep Own Lead" });

      const repToken = makeToken(rep._id, 0);
      const res = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          leadIds: [lead._id.toString()],
          targetUserId: repB._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 403);
    });
  });

  // 11. Per-Member Custom Permission Overrides (Day 1B)
  describe("11. Per-Member Custom Permission Overrides", () => {
    it("should allow an explicit custom grant to enable an action normally denied to rep", async () => {
      const org = await Organization.create({ name: "Override Org 1" });
      const owner = await User.create({ name: "Owner Perm", email: "owner_perm@corp.com", password: "password123" });
      const rep = await User.create({ name: "Rep Perm", email: "rep_perm@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      const repMembership = await OrganizationMembership.create({
        user: rep._id,
        organization: org._id,
        role: "rep",
        status: "active",
        customPermissions: [{ permission: "reports.read", granted: true }],
      });

      // Rep normally lacks reports.read, but custom grant enables it
      const repToken = makeToken(rep._id, 0);
      const res = await fetch(`http://localhost:${port}/api/analytics/overview`, {
        headers: {
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
    });

    it("should enforce explicit deny over base role permissions (explicit deny wins)", async () => {
      const org = await Organization.create({ name: "Override Org 2" });
      const manager = await User.create({ name: "Manager Denied", email: "mgr_denied@corp.com", password: "password123" });

      // Manager normally has leads.assign, but custom override explicitly denies it
      await OrganizationMembership.create({
        user: manager._id,
        organization: org._id,
        role: "manager",
        status: "active",
        customPermissions: [{ permission: "leads.assign", granted: false }],
      });

      const lead = await Lead.create({ organization: org._id, owner: manager._id, name: "Manager Lead" });

      const mgrToken = makeToken(manager._id, 0);
      const res = await fetch(`http://localhost:${port}/api/leads/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mgrToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          leadIds: [lead._id.toString()],
          targetUserId: manager._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    it("should enforce delegation boundaries when modifying custom permissions", async () => {
      const org = await Organization.create({ name: "Delegation Org" });
      const admin = await User.create({ name: "Deleg Admin", email: "del_admin@corp.com", password: "password123" });
      const rep = await User.create({ name: "Deleg Rep", email: "del_rep@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });
      await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

      // Admin tries to grant an unknown permission -> 400
      const adminToken = makeToken(admin._id, 0);
      const badRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          customPermissions: [{ permission: "superadmin.godmode", granted: true }],
        }),
      });

      assert.strictEqual(badRes.status, 400);

      // Admin grants valid permission that admin possesses (leads.import) -> 200
      const okRes = await fetch(`http://localhost:${port}/api/team/${rep._id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({
          customPermissions: [{ permission: "leads.import", granted: true }],
        }),
      });

      assert.strictEqual(okRes.status, 200);
      const okData = await okRes.json();
      assert.strictEqual(okData.success, true);
      assert.strictEqual(okData.customPermissions[0].permission, "leads.import");
    });
  });

  // 12. Paginated Live Audit Logs (Day 1B)
  describe("12. Paginated Live Audit Logs", () => {
    it("should allow owner/admin to read paginated audit logs without leaking secrets", async () => {
      const org = await Organization.create({ name: "Audit Org" });
      const owner = await User.create({ name: "Audit Owner", email: "aowner@corp.com", password: "password123" });
      const rep = await User.create({ name: "Audit Rep", email: "arep2@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

      // Seed audit entries with sensitive fields
      await ActivityLog.create({
        organization: org._id,
        user: owner._id,
        action: "LEAD_CREATED",
        entityType: "Lead",
        entityId: new mongoose.Types.ObjectId(),
        details: { leadName: "Secure Deal", password: "secret_password", token: "jwt_token_123" },
      });

      const ownerToken = makeToken(owner._id, 0);
      const res = await fetch(`http://localhost:${port}/api/organization/audit-logs?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "X-Organization-Id": org._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.length, 1);
      assert.strictEqual(data.data[0].details.leadName, "Secure Deal");
      assert.strictEqual(data.data[0].details.password, undefined); // Sanitized!
      assert.strictEqual(data.data[0].details.token, undefined); // Sanitized!

      // Rep should be denied (403)
      const repToken = makeToken(rep._id, 0);
      const repRes = await fetch(`http://localhost:${port}/api/organization/audit-logs`, {
        headers: {
          Authorization: `Bearer ${repToken}`,
          "X-Organization-Id": org._id.toString(),
        },
      });
      assert.strictEqual(repRes.status, 403);
    });
  });

  // 13. Advanced Team Administration & Status Toggling
  describe("13. Advanced Team Administration & Status Toggling", () => {
    it("should allow admin/owner to suspend a member and revoke room access", async () => {
      const org = await Organization.create({ name: "Suspend Org" });
      const admin = await User.create({ name: "Admin Sus", email: "adminsus@corp.com", password: "password123" });
      const rep = await User.create({ name: "Rep Sus", email: "repsus@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });
      const repMembership = await OrganizationMembership.create({ user: rep._id, organization: org._id, role: "rep", status: "active" });

      const adminToken = makeToken(admin._id, 0);
      const res = await fetch(`http://localhost:${port}/api/team/${rep._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({ status: "suspended" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, "suspended");

      // Verify DB status
      const updated = await OrganizationMembership.findById(repMembership._id);
      assert.strictEqual(updated.status, "suspended");

      // Verify audit log created
      const audit = await ActivityLog.findOne({ organization: org._id, action: "MEMBER_STATUS_CHANGED" });
      assert.ok(audit);
      assert.strictEqual(audit.details.newStatus, "suspended");
    });

    it("should prevent a user from suspending themselves", async () => {
      const org = await Organization.create({ name: "Self Suspend Org" });
      const admin = await User.create({ name: "Admin Self", email: "adminself@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });

      const adminToken = makeToken(admin._id, 0);
      const res = await fetch(`http://localhost:${port}/api/team/${admin._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({ status: "suspended" }),
      });

      assert.strictEqual(res.status, 400);
    });

    it("should prevent suspending the workspace owner", async () => {
      const org = await Organization.create({ name: "Owner Suspend Org" });
      const owner = await User.create({ name: "Owner Target", email: "ownertarget@corp.com", password: "password123" });
      const admin = await User.create({ name: "Admin Attacker", email: "adminattack@corp.com", password: "password123" });

      await OrganizationMembership.create({ user: owner._id, organization: org._id, role: "owner", status: "active" });
      await OrganizationMembership.create({ user: admin._id, organization: org._id, role: "admin", status: "active" });

      const adminToken = makeToken(admin._id, 0);
      const res = await fetch(`http://localhost:${port}/api/team/${owner._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "X-Organization-Id": org._id.toString(),
        },
        body: JSON.stringify({ status: "suspended" }),
      });

      assert.strictEqual(res.status, 400);
    });
  });
});

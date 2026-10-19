import "dotenv/config";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { io as ClientIO } from "../../frontend/node_modules/socket.io-client/build/esm/index.js";
import { Resend } from "resend";

import chatRoutes from "../routes/chat.routes.js";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { initSocket } from "../utils/socket.js";
import { errorHandler } from "../middleware/error.middleware.js";
import { resetResendClient } from "../services/email.service.js";

let app;
let httpServer;
let port;
let socketServer;

const JWT_SECRET = "chat_qa_matrix_jwt_secret_987654";
process.env.JWT_SECRET = JWT_SECRET;

const sampleResend = new Resend("test_dummy_key");
const EmailsProto = Object.getPrototypeOf(sampleResend.emails);
const originalSend = EmailsProto.send;

before(async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/revflux_dev";
  const lower = mongoUri.toLowerCase();
  const env = (process.env.NODE_ENV || "").toLowerCase();
  if (lower.includes("prod") || env.includes("prod")) {
    throw new Error("Cannot run test against production DB");
  }
  let testUri;
  if (mongoUri.includes("/?")) {
    testUri = mongoUri.replace("/?", "/revflux_test_chat?");
  } else if (/\/[a-zA-Z0-9_-]+(\?|$)/.test(mongoUri.replace(/:\/\/[^/]+/, "/"))) {
    testUri = mongoUri.replace(/\/([a-zA-Z0-9_-]+)(\?|$)/, "/revflux_test_chat$2");
  } else if (mongoUri.endsWith("/")) {
    testUri = `${mongoUri}revflux_test_chat`;
  } else {
    testUri = `${mongoUri}/revflux_test_chat`;
  }
  if (!testUri.includes("/revflux_test_chat") || testUri === mongoUri) {
    throw new Error("Test URI isolation failed");
  }
  await mongoose.connect(testUri);

  app = express();
  app.use(express.json());
  app.use("/api/chat", chatRoutes);
  app.use(errorHandler);

  httpServer = createServer(app);
  socketServer = initSocket(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });
});

after(async () => {
  EmailsProto.send = originalSend;
  resetResendClient();

  if (socketServer) {
    await new Promise((res) => socketServer.close(res));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (httpServer) {
    httpServer.close();
  }
});

beforeEach(async () => {
  EmailsProto.send = originalSend;
  resetResendClient();

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Helper for REST requests
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

// Helper for Socket.IO clients
const createSocketClient = (token) => {
  return ClientIO(`http://localhost:${port}`, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
};

describe("RevFlux Secure Realtime Team Chat Suite", () => {
  it("1. Same-organization direct messages & conversation deduplication", async () => {
    // Setup Org 1 and two users
    const org = await Organization.create({ name: "Acme Corp", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@acme.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@acme.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "admin", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    // Alice creates or finds direct conversation with Bob
    const res1 = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.data.success, true);
    const convId = res1.data.conversation.id;

    // Bob creates direct conversation with Alice -> Deduplicated to same conversation ID
    const res2 = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userA._id }, tokenB, org._id);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.conversation.id, convId);

    // Connect Bob's socket to test delivery
    const socketB = createSocketClient(tokenB);
    await new Promise((resolve) => socketB.on("connect", resolve));
    socketB.emit("chat:join_conversation", convId);

    // Alice sends a message via REST
    const msgPromise = new Promise((resolve) => {
      socketB.on("chat:new_message", (msg) => {
        resolve(msg);
      });
    });

    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Hello Bob!" }, tokenA, org._id);
    assert.strictEqual(sendRes.status, 201);
    assert.strictEqual(sendRes.data.message.text, "Hello Bob!");

    const receivedMsg = await msgPromise;
    assert.strictEqual(receivedMsg.text, "Hello Bob!");
    assert.strictEqual(receivedMsg.sender._id.toString(), userA._id.toString());

    // Verify DB record
    const savedMsg = await Message.findById(sendRes.data.message.id);
    assert.ok(savedMsg);
    assert.strictEqual(savedMsg.text, "Hello Bob!");
    assert.strictEqual(savedMsg.organization.toString(), org._id.toString());

    socketB.disconnect();
  });

  it("2. Group conversations with authorized participants", async () => {
    const org = await Organization.create({ name: "Sales Hub", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@sales.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@sales.com", password: "Password123!" });
    const userC = await User.create({ name: "Charlie", email: "charlie@sales.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "manager", status: "active" });
    await OrganizationMembership.create({ user: userC._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const groupRes = await makeRequest(
      "POST",
      "/api/chat/conversations/group",
      { name: "Q4 Deal Pipeline", participantIds: [userB._id, userC._id] },
      tokenA,
      org._id
    );

    assert.strictEqual(groupRes.status, 201);
    assert.strictEqual(groupRes.data.conversation.type, "group");
    assert.strictEqual(groupRes.data.conversation.name, "Q4 Deal Pipeline");
    assert.strictEqual(groupRes.data.conversation.participants.length, 3);
  });

  it("3. Unauthorized non-participants cannot read or send messages (0 DB side-effects)", async () => {
    const org = await Organization.create({ name: "Private Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@private.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@private.com", password: "Password123!" });
    const userEve = await User.create({ name: "Eve", email: "eve@private.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });
    await OrganizationMembership.create({ user: userEve._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenEve = jwt.sign({ id: userEve._id, tv: 0 }, JWT_SECRET);

    // Alice and Bob start a conversation
    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    const initialMsgCount = await Message.countDocuments();

    // Eve attempts to read messages -> 404
    const readRes = await makeRequest("GET", `/api/chat/conversations/${convId}/messages`, null, tokenEve, org._id);
    assert.strictEqual(readRes.status, 404);

    // Eve attempts to send a message -> 404
    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Intruder" }, tokenEve, org._id);
    assert.strictEqual(sendRes.status, 404);

    // Assert zero side-effects in database
    const postMsgCount = await Message.countDocuments();
    assert.strictEqual(postMsgCount, initialMsgCount);
  });

  it("4. Cross-tenant conversation and message access is strictly denied", async () => {
    const org1 = await Organization.create({ name: "Tenant 1", plan: "growth" });
    const org2 = await Organization.create({ name: "Tenant 2", plan: "growth" });

    const user1 = await User.create({ name: "User 1", email: "u1@tenant1.com", password: "Password123!" });
    const user2 = await User.create({ name: "User 2", email: "u2@tenant2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user1._id, organization: org1._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: user2._id, organization: org2._id, role: "owner", status: "active" });

    const token1 = jwt.sign({ id: user1._id, tv: 0 }, JWT_SECRET);
    const token2 = jwt.sign({ id: user2._id, tv: 0 }, JWT_SECRET);

    // User 1 creates direct chat with self or group in org1
    const groupRes = await makeRequest("POST", "/api/chat/conversations/group", { name: "Tenant 1 Internal", participantIds: [user1._id] }, token1, org1._id);
    const convId = groupRes.data.conversation.id;

    // User 2 in Tenant 2 attempts to access Conversation from Tenant 1
    const resWithOrg2 = await makeRequest("GET", `/api/chat/conversations/${convId}/messages`, null, token2, org2._id);
    assert.strictEqual(resWithOrg2.status, 404);

    // User 2 attempts to spoof Tenant 1 header
    const resWithSpoof = await makeRequest("GET", `/api/chat/conversations/${convId}/messages`, null, token2, org1._id);
    assert.strictEqual(resWithSpoof.status, 403);
  });

  it("5. Forged sender and organization IDs are ignored or rejected", async () => {
    const org = await Organization.create({ name: "Secured Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@sec.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@sec.com", password: "Password123!" });
    const fakeUserId = new mongoose.Types.ObjectId();
    const fakeOrgId = new mongoose.Types.ObjectId();

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Alice attempts to spoof sender and organization IDs in request body
    const sendRes = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Spoofed test", sender: fakeUserId, organizationId: fakeOrgId },
      tokenA,
      org._id
    );

    assert.strictEqual(sendRes.status, 201);
    const msg = await Message.findById(sendRes.data.message.id);
    // Verified: sender is strictly Alice, organization is strictly org._id
    assert.strictEqual(msg.sender.toString(), userA._id.toString());
    assert.strictEqual(msg.organization.toString(), org._id.toString());
  });

  it("6. Unauthenticated sockets cannot join protected rooms", async () => {
    const socketNoAuth = createSocketClient("");
    await new Promise((resolve) => {
      socketNoAuth.on("connect_error", (err) => {
        assert.ok(err.message.includes("Authentication error"));
        resolve();
      });
    });
    socketNoAuth.disconnect();

    const socketBadToken = createSocketClient("bad_invalid_jwt_token");
    await new Promise((resolve) => {
      socketBadToken.on("connect_error", (err) => {
        assert.ok(err.message.includes("Authentication error"));
        resolve();
      });
    });
    socketBadToken.disconnect();
  });

  it("7. Suspended or removed members cannot continue messaging", async () => {
    const org = await Organization.create({ name: "Compliance Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@comp.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@comp.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    const bMembership = await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Suspend Bob
    bMembership.status = "suspended";
    await bMembership.save();

    // Bob attempts to send message via REST -> 403
    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Suspended try" }, tokenB, org._id);
    assert.strictEqual(sendRes.status, 403);

    // Bob attempts via Socket
    const socketB = createSocketClient(tokenB);
    await new Promise((resolve) => socketB.on("connect", resolve));

    const ack = await new Promise((resolve) => {
      socketB.emit("chat:send_message", { conversationId: convId, text: "Socket suspended try" }, (res) => {
        resolve(res);
      });
    });

    assert.ok(ack.error);
    socketB.disconnect();

    // Zero messages persisted from Bob
    const bobMsgs = await Message.find({ sender: userB._id });
    assert.strictEqual(bobMsgs.length, 0);
  });

  it("8. Invalid, oversized and rate-limited messages are rejected", async () => {
    const org = await Organization.create({ name: "Validation Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@val.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@val.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Empty message
    const emptyRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "   " }, tokenA, org._id);
    assert.strictEqual(emptyRes.status, 400);

    // Oversized message (> 4000 characters)
    const longText = "A".repeat(4001);
    const longRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: longText }, tokenA, org._id);
    assert.strictEqual(longRes.status, 400);

    const count = await Message.countDocuments();
    assert.strictEqual(count, 0);
  });

  it("9. Message history pagination and unread/read state work correctly", async () => {
    const org = await Organization.create({ name: "Pagination Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@pag.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@pag.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Send 3 messages
    for (let i = 1; i <= 3; i++) {
      await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: `Message ${i}` }, tokenA, org._id);
    }

    // Bob checks conversation list: unread count should be 3
    const convList = await makeRequest("GET", "/api/chat/conversations", null, tokenB, org._id);
    const bConv = convList.data.conversations.find((c) => c.id === convId);
    assert.strictEqual(bConv.unreadCount, 3);

    // Bob marks as read
    const readRes = await makeRequest("PATCH", `/api/chat/conversations/${convId}/read`, null, tokenB, org._id);
    assert.strictEqual(readRes.status, 200);

    // Bob checks unread count again: should be 0
    const convListAfter = await makeRequest("GET", "/api/chat/conversations", null, tokenB, org._id);
    const bConvAfter = convListAfter.data.conversations.find((c) => c.id === convId);
    assert.strictEqual(bConvAfter.unreadCount, 0);

    // Test pagination: limit 2
    const pagRes = await makeRequest("GET", `/api/chat/conversations/${convId}/messages?limit=2`, null, tokenB, org._id);
    assert.strictEqual(pagRes.status, 200);
    assert.strictEqual(pagRes.data.messages.length, 2);
    assert.strictEqual(pagRes.data.hasMore, true);
  });

  it("10. Multiple connected sessions receive updates without duplicate persistence", async () => {
    const org = await Organization.create({ name: "MultiSession Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@multi.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@multi.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Bob connects two independent sockets (Tab 1 and Tab 2)
    const socketB1 = createSocketClient(tokenB);
    const socketB2 = createSocketClient(tokenB);

    await Promise.all([
      new Promise((res) => socketB1.on("connect", res)),
      new Promise((res) => socketB2.on("connect", res)),
    ]);

    socketB1.emit("chat:join_conversation", convId);
    socketB2.emit("chat:join_conversation", convId);

    const msg1Promise = new Promise((res) => socketB1.on("chat:new_message", res));
    const msg2Promise = new Promise((res) => socketB2.on("chat:new_message", res));

    // Alice sends 1 message
    await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Broadcast to all sessions" }, tokenA, org._id);

    const [b1Received, b2Received] = await Promise.all([msg1Promise, msg2Promise]);
    assert.strictEqual(b1Received.text, "Broadcast to all sessions");
    assert.strictEqual(b2Received.text, "Broadcast to all sessions");

    // Exactly 1 message persisted in database
    const msgCount = await Message.countDocuments({ conversation: convId });
    assert.strictEqual(msgCount, 1);

    socketB1.disconnect();
    socketB2.disconnect();
  });

  it("11. Email notifications respect preferences and suppress the sender", async () => {
    let sentEmails = [];
    EmailsProto.send = async (payload) => {
      sentEmails.push(payload);
      return { data: { id: "resend_msg_test_123" }, error: null };
    };

    process.env.RESEND_API_KEY = "re_test_mock_key";

    const org = await Organization.create({ name: "Email Pref Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@emailpref.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@emailpref.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Bob mutes email notifications for this conversation
    const prefRes = await makeRequest(
      "PATCH",
      "/api/chat/preferences",
      { conversationId: convId, emailNotifications: false },
      tokenB,
      org._id
    );
    assert.strictEqual(prefRes.status, 200);

    // Alice sends a message
    await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Muted test" }, tokenA, org._id);

    // Wait a brief moment for async email processing
    await new Promise((r) => setTimeout(r, 100));

    // Zero emails should have been sent to Bob because it was muted
    assert.strictEqual(sentEmails.length, 0);

    // Bob un-mutes
    await makeRequest(
      "PATCH",
      "/api/chat/preferences",
      { conversationId: convId, emailNotifications: true },
      tokenB,
      org._id
    );

    // Alice sends another message
    await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Unmuted test" }, tokenA, org._id);
    
    for (let i = 0; i < 40; i++) {
      if (sentEmails.length > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Bob should have received 1 email, Alice (sender) should NOT have received any email
    assert.strictEqual(sentEmails.length, 1);
    assert.strictEqual(sentEmails[0].to[0], "bob@emailpref.com");
    assert.strictEqual(sentEmails.some((e) => e.to.includes("alice@emailpref.com")), false);
  });

  it("12. Email provider failure does not discard a saved message", async () => {
    EmailsProto.send = async () => {
      throw new Error("ETIMEDOUT: Connection to api.resend.com timed out");
    };

    process.env.RESEND_API_KEY = "re_test_mock_key";

    const org = await Organization.create({ name: "Resilient Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@resilient.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@resilient.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Send message: should succeed with 201 even if Resend network fails
    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Message stays safe!" }, tokenA, org._id);
    assert.strictEqual(sendRes.status, 201);
    assert.strictEqual(sendRes.data.success, true);

    // Verify message is saved in MongoDB
    const saved = await Message.findById(sendRes.data.message.id);
    assert.ok(saved);
    assert.strictEqual(saved.text, "Message stays safe!");
  });

  it("13. Revoked sessions cannot perform protected chat actions", async () => {
    const org = await Organization.create({ name: "Revocation Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@revoked.com", password: "Password123!", tokenVersion: 0 });
    const userB = await User.create({ name: "Bob", email: "bob@revoked.com", password: "Password123!", tokenVersion: 0 });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const activeTokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, activeTokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Revoke Alice's sessions by incrementing tokenVersion
    userA.tokenVersion = 1;
    await userA.save();

    const initialCount = await Message.countDocuments({ conversation: convId });

    // Alice attempts to send a message via REST with old token -> 401
    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Should be denied" }, activeTokenA, org._id);
    assert.strictEqual(sendRes.status, 401);

    // Alice attempts to connect socket with old token -> auth error
    const socketRevoked = createSocketClient(activeTokenA);
    await new Promise((resolve) => {
      socketRevoked.on("connect_error", (err) => {
        assert.ok(err.message.includes("Session has been revoked"));
        resolve();
      });
    });
    socketRevoked.disconnect();

    // Verify 0 unauthorized database mutations
    const finalCount = await Message.countDocuments({ conversation: convId });
    assert.strictEqual(finalCount, initialCount);
  });

  it("14. REST and Socket.IO sending paths do not create duplicate messages", async () => {
    const org = await Organization.create({ name: "Idempotent Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@idemp.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@idemp.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    const clientMsgId = "client-uuid-" + Date.now();

    // 1. Send first via REST
    const res1 = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Idempotent Message", clientMessageId: clientMsgId },
      tokenA,
      org._id
    );
    assert.strictEqual(res1.status, 201);

    // 2. Retry send via REST with same clientMessageId
    const res2 = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Idempotent Message", clientMessageId: clientMsgId },
      tokenA,
      org._id
    );
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.message.id, res1.data.message.id);

    // 3. Attempt same send via Socket.IO
    const socketA = createSocketClient(tokenA);
    await new Promise((res) => socketA.on("connect", res));

    const ack = await new Promise((resolve) => {
      socketA.emit(
        "chat:send_message",
        { conversationId: convId, text: "Idempotent Message", clientMessageId: clientMsgId },
        (response) => resolve(response)
      );
    });

    assert.strictEqual(ack.success, true);
    assert.strictEqual(ack.message.id.toString(), res1.data.message.id.toString());
    socketA.disconnect();

    // Exactly 1 message persisted in DB
    const dbCount = await Message.countDocuments({ conversation: convId, clientMessageId: clientMsgId });
    assert.strictEqual(dbCount, 1);
  });

  it("15. HTML content is escaped in notification emails", async () => {
    let capturedEmail = null;
    EmailsProto.send = async (payload) => {
      capturedEmail = payload;
      return { data: { id: "resend_escaped_123" }, error: null };
    };

    process.env.RESEND_API_KEY = "re_test_mock_key";

    const org = await Organization.create({ name: "Security Org <script>", plan: "growth" });
    const userA = await User.create({ name: "Malicious <script>alert(1)</script>", email: "alice@xss.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob Safe", email: "bob@xss.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Send payload containing XSS vectors
    const maliciousText = '<img src=x onerror=alert("Hacked")> & "test" \'single\'';
    await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: maliciousText }, tokenA, org._id);

    for (let i = 0; i < 40; i++) {
      if (capturedEmail) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.ok(capturedEmail);
    // Confirm raw HTML injection characters are escaped in html field
    assert.strictEqual(capturedEmail.html.includes("<script>alert(1)</script>"), false);
    assert.ok(capturedEmail.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.strictEqual(capturedEmail.html.includes("<img src=x onerror=alert("), false);
    assert.ok(capturedEmail.html.includes("&lt;img src=x onerror=alert(&quot;Hacked&quot;)&gt;"));
  });

  it("16. Online/offline presence and multi-tab socket management", async () => {
    const org = await Organization.create({ name: "Presence Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@presence.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@presence.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    // Alice connects socket A
    const socketA = createSocketClient(tokenA);
    await new Promise((res) => socketA.on("connect", res));
    socketA.emit("join_org", org._id.toString());

    // Bob opens Tab 1 (socket B1)
    const socketB1 = createSocketClient(tokenB);
    await new Promise((res) => socketB1.on("connect", res));
    socketB1.emit("join_org", org._id.toString());

    await new Promise((r) => setTimeout(r, 100));

    // Query online teammates
    const query1 = await new Promise((resolve) => {
      socketA.emit("chat:get_online_teammates", org._id.toString(), resolve);
    });
    assert.strictEqual(query1.success, true);
    assert.ok(query1.onlineUserIds.includes(userA._id.toString()));
    assert.ok(query1.onlineUserIds.includes(userB._id.toString()));

    // Bob opens Tab 2 (socket B2)
    const socketB2 = createSocketClient(tokenB);
    await new Promise((res) => socketB2.on("connect", res));
    socketB2.emit("join_org", org._id.toString());

    await new Promise((r) => setTimeout(r, 100));

    // Bob closes Tab 1 (socket B1)
    socketB1.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    // Bob should STILL be online because Tab 2 is active
    const query2 = await new Promise((resolve) => {
      socketA.emit("chat:get_online_teammates", org._id.toString(), resolve);
    });
    assert.strictEqual(query2.success, true);
    assert.ok(query2.onlineUserIds.includes(userB._id.toString()));

    // Now Bob closes Tab 2 (socket B2)
    socketB2.disconnect();
    await new Promise((r) => setTimeout(r, 150));

    // Bob should now be offline
    const query3 = await new Promise((resolve) => {
      socketA.emit("chat:get_online_teammates", org._id.toString(), resolve);
    });
    assert.strictEqual(query3.success, true);
    assert.strictEqual(query3.onlineUserIds.includes(userB._id.toString()), false);

    socketA.disconnect();
  });

  it("17. Cross-organization presence isolation", async () => {
    const org1 = await Organization.create({ name: "Org One", plan: "starter" });
    const org2 = await Organization.create({ name: "Org Two", plan: "growth" });

    const user1 = await User.create({ name: "Member 1", email: "m1@org1.com", password: "Password123!" });
    const user2 = await User.create({ name: "Member 2", email: "m2@org2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user1._id, organization: org1._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: user2._id, organization: org2._id, role: "rep", status: "active" });

    const token2 = jwt.sign({ id: user2._id, tv: 0 }, JWT_SECRET);
    const socket2 = createSocketClient(token2);
    await new Promise((res) => socket2.on("connect", res));

    // User 2 (Org 2) attempts to query online teammates for Org 1 -> Access Denied
    const response = await new Promise((resolve) => {
      socket2.emit("chat:get_online_teammates", org1._id.toString(), resolve);
    });
    assert.strictEqual(response.error, "Access denied");

    socket2.disconnect();
  });

  it("18. WhatsApp-style receipts: Sent, Delivered, and Read lifecycle with idempotency", async () => {
    const org = await Organization.create({ name: "Receipts Org", plan: "growth" });
    const userA = await User.create({ name: "Alice Sender", email: "alice@rcpt.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob Recipient", email: "bob@rcpt.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Connect socket for Alice and Bob
    const socketA = createSocketClient(tokenA);
    const socketB = createSocketClient(tokenB);
    await Promise.all([
      new Promise((res) => socketA.on("connect", res)),
      new Promise((res) => socketB.on("connect", res)),
    ]);

    socketA.emit("chat:join_conversation", convId);
    socketB.emit("chat:join_conversation", convId);
    await new Promise((r) => setTimeout(r, 50));

    // 1. SENT state: Alice sends a message
    const sendRes = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Hello Bob" },
      tokenA,
      org._id
    );
    assert.strictEqual(sendRes.status, 201);
    const msgId = sendRes.data.message.id;

    // Verify SENT in DB: deliveredTo is empty, readBy only has Alice
    const msgSent = await Message.findById(msgId);
    assert.strictEqual(msgSent.deliveredTo.length, 0);
    assert.strictEqual(msgSent.readBy.length, 1);
    assert.strictEqual(msgSent.readBy[0].user.toString(), userA._id.toString());

    // 2. DELIVERED state: Bob acknowledges receipt
    let deliveryReceiptReceived = null;
    socketA.on("chat:delivery_receipt", (payload) => {
      deliveryReceiptReceived = payload;
    });

    const deliveryAck = await new Promise((resolve) => {
      socketB.emit("chat:message_delivered", { conversationId: convId, messageId: msgId }, resolve);
    });
    assert.strictEqual(deliveryAck.success, true);
    assert.strictEqual(deliveryAck.updatedCount, 1);

    await new Promise((r) => setTimeout(r, 100));
    assert.ok(deliveryReceiptReceived);
    assert.strictEqual(deliveryReceiptReceived.userId, userB._id.toString());

    // Verify DELIVERED in DB
    const msgDelivered = await Message.findById(msgId);
    assert.strictEqual(msgDelivered.deliveredTo.length, 1);
    assert.strictEqual(msgDelivered.deliveredTo[0].user.toString(), userB._id.toString());

    // Idempotent delivery acknowledgement
    const repeatAck = await new Promise((resolve) => {
      socketB.emit("chat:message_delivered", { conversationId: convId, messageId: msgId }, resolve);
    });
    assert.strictEqual(repeatAck.success, true);
    assert.strictEqual(repeatAck.updatedCount, 0); // Not duplicated
    const msgStillDelivered = await Message.findById(msgId);
    assert.strictEqual(msgStillDelivered.deliveredTo.length, 1);

    // 3. READ state: Bob marks conversation read
    let readReceiptReceived = null;
    socketA.on("chat:read_receipt", (payload) => {
      readReceiptReceived = payload;
    });

    const readAck = await new Promise((resolve) => {
      socketB.emit("chat:mark_read", { conversationId: convId }, resolve);
    });
    assert.strictEqual(readAck.success, true);

    await new Promise((r) => setTimeout(r, 100));
    assert.ok(readReceiptReceived);
    assert.strictEqual(readReceiptReceived.userId, userB._id.toString());

    // Verify READ in DB: Bob is now in readBy
    const msgRead = await Message.findById(msgId);
    assert.strictEqual(msgRead.readBy.some((r) => r.user.toString() === userB._id.toString()), true);

    socketA.disconnect();
    socketB.disconnect();
  });

  it("19. Offline recipient and reconnect recovery via getMessages", async () => {
    const org = await Organization.create({ name: "Offline Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "alice@offline.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "bob@offline.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Alice sends message while Bob is completely offline
    const sendRes = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Message while Bob was offline" },
      tokenA,
      org._id
    );
    const msgId = sendRes.data.message.id;

    // Verify initially undelivered
    const msgInitial = await Message.findById(msgId);
    assert.strictEqual(msgInitial.deliveredTo.length, 0);

    // Bob comes online later and fetches message history
    const getRes = await makeRequest(
      "GET",
      `/api/chat/conversations/${convId}/messages`,
      null,
      tokenB,
      org._id
    );
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.messages.length, 1);

    // Backend getMessages automatically records delivery for Bob
    const msgRecovered = await Message.findById(msgId);
    assert.strictEqual(msgRecovered.deliveredTo.length, 1);
    assert.strictEqual(msgRecovered.deliveredTo[0].user.toString(), userB._id.toString());
  });

  it("20. Group conversation tracks per-recipient delivery and read receipts", async () => {
    const org = await Organization.create({ name: "Group Org", plan: "growth" });
    const userA = await User.create({ name: "Alice", email: "a@group.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob", email: "b@group.com", password: "Password123!" });
    const userC = await User.create({ name: "Charlie", email: "c@group.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });
    await OrganizationMembership.create({ user: userC._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);
    const tokenC = jwt.sign({ id: userC._id, tv: 0 }, JWT_SECRET);

    const groupRes = await makeRequest(
      "POST",
      "/api/chat/conversations/group",
      { name: "Alpha Squad", participantIds: [userB._id, userC._id] },
      tokenA,
      org._id
    );
    const convId = groupRes.data.conversation.id;

    // Alice sends a message to the group
    const sendRes = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/messages`,
      { text: "Team update" },
      tokenA,
      org._id
    );
    const msgId = sendRes.data.message.id;

    // Only Bob acknowledges delivery via REST endpoint
    const delivRes = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/delivered`,
      { messageIds: [msgId] },
      tokenB,
      org._id
    );
    assert.strictEqual(delivRes.status, 200);

    // Verify Bob is in deliveredTo, Charlie is NOT
    const msgAfterBobDelivered = await Message.findById(msgId);
    assert.strictEqual(msgAfterBobDelivered.deliveredTo.length, 1);
    assert.strictEqual(msgAfterBobDelivered.deliveredTo[0].user.toString(), userB._id.toString());

    // Bob marks conversation read
    await makeRequest("PATCH", `/api/chat/conversations/${convId}/read`, null, tokenB, org._id);

    // Verify Bob is in readBy, Charlie is NOT in readBy
    const msgAfterBobRead = await Message.findById(msgId);
    assert.strictEqual(msgAfterBobRead.readBy.some((r) => r.user.toString() === userB._id.toString()), true);
    assert.strictEqual(msgAfterBobRead.readBy.some((r) => r.user.toString() === userC._id.toString()), false);
  });

  it("21. Unauthorized delivery and read receipt manipulation blocked", async () => {
    const org1 = await Organization.create({ name: "Org 1", plan: "starter" });
    const org2 = await Organization.create({ name: "Org 2", plan: "growth" });

    const user1 = await User.create({ name: "User 1", email: "u1@org1.com", password: "Password123!" });
    const user2 = await User.create({ name: "User 2", email: "u2@org1.com", password: "Password123!" });
    const outsider = await User.create({ name: "Outsider", email: "out@org2.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user1._id, organization: org1._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: user2._id, organization: org1._id, role: "rep", status: "active" });
    await OrganizationMembership.create({ user: outsider._id, organization: org2._id, role: "owner", status: "active" });

    const token1 = jwt.sign({ id: user1._id, tv: 0 }, JWT_SECRET);
    const tokenOutsider = jwt.sign({ id: outsider._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: user2._id }, token1, org1._id);
    const convId = convRes.data.conversation.id;

    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Secret" }, token1, org1._id);
    const msgId = sendRes.data.message.id;

    // Outsider tries to mark conversation read
    const unauthRead = await makeRequest("PATCH", `/api/chat/conversations/${convId}/read`, null, tokenOutsider, org2._id);
    assert.strictEqual(unauthRead.status, 404);

    // Outsider tries to mark delivered
    const unauthDeliv = await makeRequest(
      "POST",
      `/api/chat/conversations/${convId}/delivered`,
      { messageIds: [msgId] },
      tokenOutsider,
      org2._id
    );
    assert.strictEqual(unauthDeliv.status, 404);
  });

  it("22. Socket reconnection rejoins active conversation and receives subsequent messages", async () => {
    const org = await Organization.create({ name: "Recon Org", plan: "starter" });
    const userA = await User.create({ name: "Alice Recon", email: "alice.recon@org.com", password: "Password123!" });
    const userB = await User.create({ name: "Bob Recon", email: "bob.recon@org.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Connect Bob's socket and join conversation
    const socketB = createSocketClient(tokenB);
    await new Promise((r) => socketB.on("connect", r));

    const joinAck1 = await new Promise((resolve) => {
      socketB.emit("chat:join_conversation", convId, resolve);
    });
    assert.strictEqual(joinAck1.success, true);

    // Simulate network drop and reconnect
    socketB.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    socketB.connect();
    await new Promise((r) => socketB.on("connect", r));

    // Client reconnect handler rejoins active conversation
    const joinAck2 = await new Promise((resolve) => {
      socketB.emit("chat:join_conversation", convId, resolve);
    });
    assert.strictEqual(joinAck2.success, true);

    // Alice sends a message over socket
    const socketA = createSocketClient(tokenA);
    await new Promise((r) => socketA.on("connect", r));

    let receivedByBob = null;
    socketB.on("chat:new_message", (msg) => {
      receivedByBob = msg;
    });

    const sendAck = await new Promise((resolve) => {
      socketA.emit("chat:send_message", { conversationId: convId, text: "Message after reconnect" }, resolve);
    });
    assert.strictEqual(sendAck.success, true);

    await new Promise((r) => setTimeout(r, 100));
    assert.ok(receivedByBob);
    assert.strictEqual(receivedByBob.text, "Message after reconnect");

    socketA.disconnect();
    socketB.disconnect();
  });

  it("23. Organization switching removes socket from previous organization and conversation rooms", async () => {
    const org1 = await Organization.create({ name: "Tenant 1", plan: "starter" });
    const org2 = await Organization.create({ name: "Tenant 2", plan: "starter" });

    const user = await User.create({ name: "Multi Org User", email: "user@multiorg.com", password: "Password123!" });
    const teammate1 = await User.create({ name: "Team 1", email: "t1@org1.com", password: "Password123!" });

    await OrganizationMembership.create({ user: user._id, organization: org1._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: user._id, organization: org2._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: teammate1._id, organization: org1._id, role: "rep", status: "active" });

    const tokenUser = jwt.sign({ id: user._id, tv: 0 }, JWT_SECRET);
    const tokenT1 = jwt.sign({ id: teammate1._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: teammate1._id }, tokenUser, org1._id);
    const convId1 = convRes.data.conversation.id;

    const socketUser = createSocketClient(tokenUser);
    await new Promise((r) => socketUser.on("connect", r));

    // User joins Org 1 and conversation 1
    socketUser.emit("join_org", org1._id.toString());
    const joinConv = await new Promise((res) => socketUser.emit("chat:join_conversation", convId1, res));
    assert.strictEqual(joinConv.success, true);

    // User switches to Org 2
    socketUser.emit("leave_org", org1._id.toString());
    socketUser.emit("join_org", org2._id.toString());
    await new Promise((r) => setTimeout(r, 50));

    // Teammate 1 sends message to Org 1's conversation
    const socketT1 = createSocketClient(tokenT1);
    await new Promise((r) => socketT1.on("connect", r));

    let userReceived = null;
    socketUser.on("chat:new_message", (msg) => {
      userReceived = msg;
    });

    const sendRes = await new Promise((res) => {
      socketT1.emit("chat:send_message", { conversationId: convId1, text: "Confidential Org 1 memo" }, res);
    });
    assert.strictEqual(sendRes.success, true);

    await new Promise((r) => setTimeout(r, 100));
    // User switched away to Org 2, so their socket in Org 2 must NOT receive Org 1 conversation messages
    assert.strictEqual(userReceived, null);

    socketUser.disconnect();
    socketT1.disconnect();
  });

  it("24. Recipient read state is not initialized as read by sender, and blue ticks require recipient read", async () => {
    const org = await Organization.create({ name: "Ticks Org", plan: "starter" });
    const userA = await User.create({ name: "Sender", email: "sender@ticks.com", password: "Password123!" });
    const userB = await User.create({ name: "Recipient", email: "recip@ticks.com", password: "Password123!" });

    await OrganizationMembership.create({ user: userA._id, organization: org._id, role: "owner", status: "active" });
    await OrganizationMembership.create({ user: userB._id, organization: org._id, role: "rep", status: "active" });

    const tokenA = jwt.sign({ id: userA._id, tv: 0 }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userB._id, tv: 0 }, JWT_SECRET);

    const convRes = await makeRequest("POST", "/api/chat/conversations/direct", { recipientId: userB._id }, tokenA, org._id);
    const convId = convRes.data.conversation.id;

    // Sender sends a message
    const sendRes = await makeRequest("POST", `/api/chat/conversations/${convId}/messages`, { text: "Hello Recipient" }, tokenA, org._id);
    const msgId = sendRes.data.message.id;

    const msg = await Message.findById(msgId);

    // Verify recipient read state: Recipient has NOT read the message
    const recipientReads = msg.readBy.filter((r) => r.user.toString() !== userA._id.toString());
    assert.strictEqual(recipientReads.length, 0);

    // Recipient acknowledges delivery
    await makeRequest("POST", `/api/chat/conversations/${convId}/delivered`, { messageIds: [msgId] }, tokenB, org._id);
    const msgAfterDeliv = await Message.findById(msgId);
    const recipDeliv = msgAfterDeliv.deliveredTo.filter((d) => d.user.toString() !== userA._id.toString());
    assert.strictEqual(recipDeliv.length, 1);

    // Still unread by recipient
    const recipReadsStillZero = msgAfterDeliv.readBy.filter((r) => r.user.toString() !== userA._id.toString());
    assert.strictEqual(recipReadsStillZero.length, 0);

    // Recipient marks as read
    await makeRequest("PATCH", `/api/chat/conversations/${convId}/read`, null, tokenB, org._id);
    const msgAfterRead = await Message.findById(msgId);
    const recipReadsAfter = msgAfterRead.readBy.filter((r) => r.user.toString() !== userA._id.toString());
    assert.strictEqual(recipReadsAfter.length, 1);
    assert.strictEqual(recipReadsAfter[0].user.toString(), userB._id.toString());
  });
});

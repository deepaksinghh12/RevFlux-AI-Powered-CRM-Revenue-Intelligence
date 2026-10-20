# Changelog

All notable changes to **RevFlux** (AI-Powered Multi-Tenant B2B Revenue Operations & CRM SaaS) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.1.0] - 2026-10-19

### 🚀 Summary
Release v1.1.0 delivers high-reliability real-time team collaboration, WhatsApp-style delivery and read receipts, tenant-isolated presence, production CORS security hardening, and pre-write CSV lead quota enforcement.

### Added
- **WhatsApp-Style Message Receipts**:
  - Distinct sent, delivered, and read receipt lifecycle:
    - **1 Grey Tick (`Check`)**: Message successfully persisted to MongoDB.
    - **2 Grey Ticks (`CheckCheck`)**: Message delivered to recipient browser via WebSocket or REST.
    - **2 Sky-Blue Ticks (`CheckCheck text-sky-400`)**: Message read by recipient in an actively focused chat tab.
  - Multi-participant group conversation receipt tracking with fractional badges (e.g., `Read by 2 of 4`).
  - Strict sender exclusion: sender ID is excluded from recipient delivery and read counts, eliminating premature double blue ticks.
  - Delivery receipt REST fallback (`POST /api/chat/conversations/:id/delivered`) and read receipt endpoint (`PATCH /api/chat/conversations/:id/read`).
- **Real-Time Presence & Multi-Tab Socket Management**:
  - In-memory tenant-scoped presence tracking (`onlineUsers` Map of `Set<socketId>`) with zero per-heartbeat database write overhead.
  - Accurate multi-tab coordination: user status transitions to offline only when their final browser tab disconnects.
  - Reconnection recovery: sockets automatically rejoin active conversation rooms (`chat_conv_${id}`) upon reconnection and re-sync unread messages silently without full-page reloads.
- **Organization Room Isolation**:
  - Dedicated socket event `leave_org` on workspace switching.
  - Sockets automatically leave previous `org_*` and `chat_conv_*` rooms upon switching organizations to prevent cross-tenant event leakage.
  - Active membership verification on room join (`join_org` rejects suspended or non-member users).
- **Tab Visibility Awareness**:
  - Frontend (`Chat.jsx` and `TeamChatWidget.jsx`) checks `document.visibilityState === "visible"` before marking messages as read.
  - Window `focus` and `visibilitychange` listeners emit `chat:mark_read` only when the user actually views the chat.
- **Strict Production CORS Hardening** (`backend/utils/cors.js`):
  - Centralized origin validator shared across Express REST API and Socket.IO server.
  - Whitelisted exact production domains (`https://revflux.deepaksinghdev.in`, `https://www.revflux.deepaksinghdev.in`).
  - Scoped RevFlux preview regex (`/^https:\/\/revflux(-[a-z0-9-]+)?\.vercel\.app$/`), rejecting arbitrary `.vercel.app` domains.
  - Strict production loopback rejection: blocks `localhost` and `127.0.0.1` origins in production mode (`NODE_ENV === "production"`), while preserving local developer convenience in non-production environments.
- **CSV Lead Import Quota Enforcement**:
  - Attached `checkLeadLimit` middleware to `POST /api/leads/import` and `POST /api/leads/bulk`.
  - Added pre-write quota calculation in `importLeads`: rejects batch upfront with HTTP 402 if `currentLeadCount + incomingRows > leadLimit` before writing any records to the database.
  - Filtered out soft-deleted leads (`isDeleted: { $ne: true }`) from quota counts.
  - Added explicit quota bypass for unlimited plans (`plan === "business"` or `leadLimit >= 999999`).
- **Comprehensive Verification Test Suites**:
  - Added Tests 22, 23, and 24 to `backend/tests/chat.test.js` (socket reconnect room rejoin, org switch room eviction, recipient read ticks).
  - Added `backend/tests/lead_import_cors.test.js` (18 tests covering CORS allow/deny rules, CSV import quota enforcement, zero-write rejection, and client receipt helpers).
  - Total automated verification: **148/148 backend tests passing** across 9 test suites; Vite production build passing with 0 errors.

### Fixed
- Fixed race condition in `Chat.jsx` and `TeamChatWidget.jsx` during rapid conversation switching using request ID sequence tokens (`activeRequestIdRef`).
- Fixed message deduplication merging REST history and realtime socket streams by `clientMessageId || id || _id`.
- Restored active membership authorization validation in `join_org` socket event handler.

---

## [v1.0.0] - 2026-09-30

### Initial Commercial MVP Release
- Multi-tenant B2B CRM foundation with organization scoping (`req.organization._id`).
- Role-based access control (RBAC): Owner, Admin, Manager, Rep, Viewer.
- Sales pipeline and deal execution with stage management, Kanban board, and analytics.
- AI Sales Intelligence: hybrid risk scoring, lead summaries, email generation, and Copilot tools.
- Team administration with sequential organization-specific Member IDs (e.g. `REVQA-001`).
- Email integration with Resend, Cloudinary attachment storage, and passwordless Email OTP authentication.

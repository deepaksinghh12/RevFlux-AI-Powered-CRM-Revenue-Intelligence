# RevFlux — Technical Architecture & Engineering Concepts Guide

> **Purpose**: This document provides a complete technical breakdown of RevFlux's architecture, system design decisions, data flow, AI engineering strategies, security patterns, and interview talking points.

---

## 📐 1. System Architecture Overview

RevFlux is an AI-powered SaaS CRM built with a modern full-stack JavaScript architecture designed for scalability, zero-latency feedback, and interview-grade production standards.

```
                    ┌─────────────────────────────────────────┐
                    │               Browser Client            │
                    │        (React 19 + Vite + Tailwind)     │
                    └────────────────────┬────────────────────┘
                                         │
                         HTTPS / REST    │   Socket.io (WebSockets)
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │            Node.js / Express API        │
                    │   (Auth, Plan Gating, Validation, Jobs) │
                    └──────┬──────────┬──────────┬─────────┬──┘
                           │          │          │         │
             MongoDB Query │          │ HTTP     │ HTTP    │ HTTP
                           ▼          ▼          ▼         ▼
                    ┌──────────┐ ┌─────────┐ ┌───────┐ ┌────────────┐
                    │ MongoDB  │ │ Gemini /│ │Resend │ │ Cloudinary │
                    │ Atlas DB │ │OpenRouter│ │ Email │ │ File Store │
                    └──────────┘ └─────────┘ └───────┘ └────────────┘
```

---

## 🧠 2. Core Technical Concepts & Engineering Decisions

### Concept A: Hybrid AI Risk Engine (Why Not Raw LLM Calls?)
* **Problem**: Calling an LLM (like GPT-4o-mini or Gemini) on every dashboard load to score 100+ leads is slow (2-5s latency per call), expensive (burns API tokens), and non-deterministic (scores fluctuate randomly).
* **RevFlux Solution (Hybrid Approach)**:
  1. **Deterministic Business Rules** (Fast & Free): Calculate days since last activity (`updatedAt`), days stuck in current stage, and missing follow-up tasks using pure JavaScript logic.
  2. **Rule-Based Scoring**: Derive a predictable 0–100 risk score and structured risk flags (*e.g., "Inactivity for 9 days"*, *"Stuck in Proposal stage for 18 days"*).
  3. **Targeted LLM Action Recommendation**: Only when the user requests an AI summary or email draft, RevFlux passes the pre-calculated risk reasons to the LLM.
* **Result**: Lightning-fast dashboard loading, zero token waste, explainable risk reasons, and high AI precision.

---

### Concept B: Subscription Billing & Usage-Based Plan Gating
* **Architecture**: Subscription logic is decoupled from business controllers using Express middleware (`checkLeadLimit`).
* **Tier Capacity Limits**:
  - **Free Tier**: Capped at **50 active leads**.
  - **Growth Tier**: Up to **500 active leads** + AI features.
  - **Enterprise Tier**: **10,000+ (Unlimited)**.
* **Execution Flow**:
  1. User attempts to create a lead (`POST /api/leads` or `POST /api/leads/bulk`).
  2. `checkLeadLimit` middleware queries current lead count for `req.user._id`.
  3. If `currentCount >= leadLimit`, the request is blocked early with a `403 Forbidden` response and an upgrade trigger payload before reaching database write logic.

---

### Concept C: Error-Tolerant Bulk Data Ingestion (CSV Importer)
* **Problem**: In enterprise CRMs, importing 1,000 rows shouldn't fail completely if row #452 has an invalid phone number.
* **RevFlux Solution (4-Step Pipeline)**:
  1. **Upload & Parse**: Client reads CSV using PapaParse without sending file bytes to server immediately.
  2. **Dynamic Header Mapping**: Auto-matches CSV column headers (*"Full Name"*, *"Deal Size"*, *"Email Addr"*) to internal Mongoose schema properties (`name`, `value`, `email`).
  3. **Validation & Preview**: Client-side validation identifies valid rows, missing emails, and duplicate entries before execution.
  4. **Error-Tolerant Bulk Insert**: Backend executes batch insertion using `insertMany(leads, { ordered: false })`. If some rows fail unique constraint checks, valid rows are still inserted cleanly.

---

### Concept D: Real-Time Event Synchronization (WebSockets)
* **Implementation**: Socket.io connection authenticated via JWT token headers.
* **Events Emitted**:
  - `lead:created` — Triggers live dashboard tile & activity stream updates.
  - `lead:updated` — Live updates Kanban board columns across all logged-in rep sessions.
  - `lead:deleted` — Dynamically removes card without page refresh.
* **Fallback Protection**: Implemented connection guards and URL fallback to prevent frontend white-screen crashes if WebSocket connection fails.

---

### Concept E: Security & API Hardening

#### 1. ReDoS (Regular Expression Denial of Service) Prevention
When users type in the lead search bar, their query string is passed to MongoDB regex search (`$regex`).
* **Vulnerability**: Typing special characters like `(((((((a+)+)+)+)+)+)+)` can cause exponential backtracking in regex engines, freezing the CPU server thread.
* **Fix**: Implemented `escapeRegex()` utility in `backend/utils/sanitize.js`:
  ```js
  export function escapeRegex(text) {
    if (!text || typeof text !== "string") return "";
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }
  ```

#### 2. Sliding-Window IP Rate Limiting
* Implemented in-memory sliding-window rate limiters ([rateLimit.middleware.js](file:///D:/coding/crm_dash/backend/middleware/rateLimit.middleware.js)) on:
  - Auth Endpoints (`/api/auth/*`): 25 requests per 15 mins (prevents brute-force credential stuffing).
  - AI Endpoints (`/api/ai/*`): 50 requests per 15 mins (prevents API key exhaustion).

#### 3. Schema Payload Validation
* Created `validateBody` middleware ([validate.middleware.js](file:///D:/coding/crm_dash/backend/middleware/validate.middleware.js)) enforcing schema rules ([schemas.js](file:///D:/coding/crm_dash/backend/validators/schemas.js)) before requests hit controller logic.

---

## 🗄️ 3. Database Entity Relationships (ERD)

```
        ┌──────────────┐
        │     User     │
        └──────┬───────┘
               │ 1:N (owner)
               ▼
        ┌──────────────┐
        │     Lead     │◄────────┐
        └──────┬───────┘         │
               │                 │ 1:N (lead)
       ┌───────┼───────┐         │
       │ 1:N   │ 1:N   │ 1:N     │
       ▼       ▼       ▼         │
 ┌─────────┐ ┌──────┐ ┌──────┐ ┌─┴───────┐
 │ Contact │ │ Note │ │ Task │ │Activity │
 └─────────┘ └──────┘ └──────┘ └─────────┘
```

- **User**: Represents a sales rep/workspace admin (`email`, `password`, `role`, `plan`, `leadLimit`).
- **Lead**: Primary revenue entity (`name`, `company`, `email`, `value`, `status`, `priority`, `aiRiskScore`, `updatedAt`).
- **Contact**: Individual person associated with a lead/company.
- **Note**: Internal sales note linked to a specific lead.
- **Task**: Scheduled follow-up item (`dueDate`, `priority`, `status`, `lead`).

---

## 🎯 4. Key Interview Q&A Talking Points

### Q: "How did you handle AI integration in RevFlux?"
> *"Instead of relying entirely on expensive, slow LLM calls for every dashboard load, I engineered a hybrid risk scoring architecture. Deterministic JavaScript rules compute lead inactivity, stage duration, and missing follow-ups into a 0-100 risk score with clear reasons instantly. I then use LLMs specifically for generative tasks like personalized email outreach and executive briefings, keeping latency under 100ms for pipeline browsing while saving API costs."*

### Q: "How do you ensure enterprise security and reliability?"
> *"I implemented a defense-in-depth approach across our Node/Express backend. All incoming search queries are sanitized against ReDoS attacks using custom regex escaping. API routes are protected by sliding-window rate limiters, strict payload validation middleware, and middleware-based plan gating to enforce usage quotas."*

---

## 🚀 Quick Commands Reference

- **Run Frontend**: `cd frontend && npm run dev`
- **Run Backend**: `cd backend && npm run dev`
- **Build Frontend**: `cd frontend && npm run build`
- **Containerize Stack**: `docker-compose up --build`

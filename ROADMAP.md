# 🚀 RevFlux — Sellable MVP Roadmap & Technical Architecture

> **Last updated**: September 2026  
> **Core positioning**: *RevFlux helps small sales teams stop losing leads and follow-ups by combining CRM, AI sales intelligence, and actionable follow-up management.*  
> **Stack**: **React 19 + Vite** (frontend) · **Node.js + Express** (backend) · **MongoDB** · **OpenRouter / gpt-4o-mini** (AI) · **Resend** (Email) · **Socket.io** (Real-time) · **Cloudinary** (Attachments)

---

## 🎯 Commercial MVP Roadmap (Sprint Execution Order)

### 📌 Sprint 0 — Bug Fixes & Codebase Stabilization (DONE ✅)
- Fix Socket.io authentication & VITE_API_URL fallback.
- Fix CSV import crash (`fetchLeads` -> `load`).
- Fix AI Risk Score persistence (`result.riskScore` -> `result.aiRiskScore`).
- Standardize `ApiError.js` import casing across 7 backend modules (Linux build stability).
- Fix Email activity Note linkage (`relatedLead` -> `lead`).
- Fix auto-scoring cron job score direction, zero handling, and `updatedAt` infinite re-processing.
- Fix route declaration order for Cloudinary attachments in `lead.routes.js`.
- Fix UI rendering bugs for form fields in `PublicCaptureForm` and `TaskScheduleDialog`.
- Clean up unused dependencies (`@google/genai`).

---

### 📌 Sprint 1 — Lead Detail Page (`/leads/:id`) (NEXT 🚧)
- Dedicated full-page view for deep deal execution.
- Activity timeline aggregating notes, tasks, emails, and stage history.
- AI Intelligence section (Summary, Risk Score, Risk Reasons, Next Best Action).
- Quick action toolbar: Send Email, Add Note, Create Task, Schedule Follow-up, Change Stage.

---

### 📌 Sprint 2 — AI Attention Center (Dashboard)
- Signature sales co-pilot feature: **"What should I do TODAY?"**
- Surfaces high-risk leads based on deterministic business rules + LLM action suggestions.
- Explains *why* a lead is at risk (e.g. *"No activity for 9 days"*, *"Stuck in Proposal for 23 days"*).
- Direct "Take Action" buttons (Generate Email, Create Task).

---

### 📌 Sprint 3 — Sales Dashboard Polish
- Pipeline KPI tiles (Total Value, Active Leads, Won Revenue, Conversion Rate).
- Overdue follow-ups & today's tasks widget.
- Visual charts: Revenue forecasts, Win/Loss by source, Stage conversion progress.

---

### 📌 Sprint 4 — Multi-Step CSV Ingestion Pipeline
- Column mapping step (`CSV Column` -> `CRM Field`).
- Data validation & duplicate detection preview step.
- Error-tolerant bulk import (doesn't fail the batch due to a single malformed row).
- Success summary report.

---

### 📌 Sprint 5 — Onboarding & Demo Workspace
- First-time user welcome wizard (`/onboarding`).
- Option to seed workspace with realistic sample data in one click.
- Interactive demo mode (`/demo`) for website visitors.

---

### 📌 Sprint 6 — SaaS Landing Page & Pricing
- Conversion-focused landing page (`/`) with Hero, Problem/Solution, Screenshots, Features, and FAQ.
- Pricing plans page (`/pricing`): Free (₹0), Starter (₹499/mo), Growth (₹1,499/mo), Business (₹2,999/mo).

---

### 📌 Sprint 7 — Billing Foundation & Monetization
- Subscription model abstraction (plan, trial status, usage limits).
- Indian payment gateway integration (Razorpay / Stripe).
- Usage-based plan gating (lead limits, AI call caps).

---

### 📌 Sprint 8 — Production Hardening & Full-Stack Infrastructure
- **Security & Validation**: Request validation with `Zod`, security headers with `helmet`, rate limiting (`express-rate-limit`) on AI and Auth endpoints.
- **Performance & Scale**: API pagination for leads and contacts, MongoDB compound indexes.
- **Containerization**: `Dockerfile` for backend & frontend + `docker-compose.yml` for local dev parity.
- **Cloud Infrastructure**: AWS Free Tier deployment guide (App Runner / EC2, MongoDB Atlas, S3 / Cloudinary).

---

## 🏛️ Post-MVP / Scale Architecture (Future Enhancements)

1. **Multi-Tenancy & Team RBAC**: Workspace model (`orgId` scoping), Roles (`Owner`, `Manager`, `Rep`), Lead assignment.
2. **Event-Driven Architecture**: `BullMQ` + `Redis` background queue for AI scoring and bulk email delivery.
3. **Semantic CRM (RAG)**: MongoDB Atlas Vector Search over lead notes and meeting transcripts.
4. **WhatsApp Business API**: Inbound/outbound WhatsApp message sync into lead timeline.

---

## 🛠️ Full-Stack Resume Talking Points

- **Frontend**: React 19, Vite, Tailwind CSS v4, `@dnd-kit` drag-and-drop, Recharts analytics, React Big Calendar.
- **Backend Architecture**: Layered Node.js/Express architecture (Route -> Middleware -> Controller -> Service -> Model).
- **Applied AI**: Hybrid risk scoring combining deterministic business heuristics with structured LLM JSON outputs via OpenRouter.
- **Real-time & Async**: Socket.io room-based notifications, Node-cron background daemons, Resend email integration.
- **Production Engineering**: Docker containerization, Zod API validation, rate-limiting, Cloudinary media storage, MongoDB index optimization.


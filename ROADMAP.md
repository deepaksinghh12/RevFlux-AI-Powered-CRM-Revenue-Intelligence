# 🚀 TTP CRM Dashboard — Roadmap & Future Upgrades

> Last updated: September 2026  
> Stack: **React + Vite** (frontend) · **Express + MongoDB** (backend) · **OpenRouter / gpt-4o-mini** (AI)

---

## ✅ Already Shipped

- JWT local auth (register / login / profile)
- Full lead pipeline with Kanban drag-and-drop
- Contacts, Notes, Tasks — full CRUD
- AI features: Lead Summary, Email Draft, Sales Insights (via OpenRouter)
- Seed script for demo data
- **Google OAuth Login**: Users can sign in with Google seamlessly.
- **Email Sending Integration**: Draft and send emails directly from the CRM using Resend.
- **Advanced Analytics Dashboard**: Richer charts, Win/Loss by source, Deal Cycle, Revenue Forecast.
- **Real-time Notifications**: Socket.io powered instant notifications for deals and tasks.
- **CSV Import / Export**: PapaParse bulk upload and full table export.
- **Tags & Smart Filters**: Multi-select tags, global search, and filtered views.
- **File Attachments on Leads**: Upload PDFs and Images directly to leads via Cloudinary.

---

## 🌟 Upgrade Features (Ranked by Impact)

---

### 1. 📅 Calendar & Follow-up Scheduling
Never miss a follow-up again.

- Task due dates shown on a mini calendar view
- "Schedule follow-up" button on lead detail → creates a Task with a date
- Optional: **Google Calendar sync** via Google Calendar API (free tier)
- **Effort**: ~5 hours

---

### 2. 👥 Team & Role Management
Scale from solo to a real sales team.

- Invite team members by email
- Roles: `owner` / `manager` / `rep`
- Reps only see their own leads; managers see all
- Lead assignment (`assignedTo` field on Lead model)
- **Effort**: ~8 hours

---

### 3. 🤖 AI Auto-scoring (Background Job)
Currently AI risk score is generated on demand — automate it.

- Nightly cron job re-scores all leads based on activity (last contact date, notes, stage age)
- Leads that haven't moved in 30 days get flagged as "Stale"
- Dashboard widget: "⚠️ 4 leads need attention"
- **Effort**: ~4 hours

---

### 4. 🌐 Public Lead Capture Form
Generate a shareable link — prospects fill a form and land directly in your pipeline.

- `GET /forms/:token` — public, no auth required
- Form submits to `POST /api/leads/capture/:token`
- Lead auto-created with status `New`, owner set to the user who generated the link
- **Effort**: ~4 hours

---

## 🏢 Enterprise & Scale Features (Portfolio Showpieces)

These features demonstrate full-stack maturity, systems architecture, and applied AI depth.

### 1. Multi-Tenancy & RBAC
- **Workspace Model**: Shared database with `orgId` tenant scoping. Leads/Contacts belong to the Workspace, not just a single user.
- **Role-Based Access Control**: `Admin`, `Manager`, and `Rep` roles. Reps only see their assigned leads; Managers see the whole team pipeline.
- **Audit Logs**: Immutable history of who changed what stage/note and when.

### 2. Event-Driven Architecture & Queues
- **Background Workers**: Integrate `BullMQ` + `Redis` to move AI email generation, lead auto-scoring, and massive CSV imports off the main Node.js thread.
- **Webhooks**: Allow outbound webhooks so tenants can subscribe to events (e.g., `lead.won`) for Zapier/Slack integration.

### 3. Data & AI Maturity (RAG)
- **Atlas Vector Search**: Generate embeddings for all lead notes and conversations.
- **Semantic Pipeline Search**: Allow reps to ask natural language questions across the entire pipeline (e.g., *"Which leads mentioned budget concerns in the last 30 days?"*).
- **Model Routing**: Fallback logic to cheaper models if the primary LLM fails or rate-limits.

### 4. Reliability & Governance
- **API Rate Limiting**: Per-tenant rate limits (Redis + `express-rate-limit`) to prevent noisy neighbors.
- **Circuit Breakers**: Wrap third-party AI/Resend calls with retries and fallbacks.
- **Field-level Encryption**: Encrypt PII (emails/phone numbers) at rest in MongoDB.

---

## 🗂️ Technical Debt & Quality-of-Life

| Task | Priority | Effort |
|---|---|---|
| Expand Profile section (settings, security, billing, **multi-currency support**) | High | 4h |
| Add Sales Blog / Industry News widget to Dashboard | Medium | 4h |
| Make global search bar (top nav) functional | High | 3h |
| Implement in-app notification center | High | 6h |
| Add pagination to leads/contacts list | High | 2h |
| Rate limiting on AI endpoints (`express-rate-limit`) | High | 1h |
| Input validation with `zod` on all routes | Medium | 3h |
| Unit tests for controllers (`vitest` / `jest`) | Medium | 6h |
| Docker Compose for one-command local setup | Low | 3h |
| Deploy to Railway / Render (backend) + Vercel (frontend) | Medium | 4h |

---

## 🧭 Suggested Sprint Order

```
Sprint 1 (this week):   Google OAuth + Email Sending
Sprint 2:               CSV Import/Export + Tags & Filters
Sprint 3:               Advanced Analytics + Real-time Notifications
Sprint 4:               Team Management + File Attachments
Sprint 5:               AI Auto-scoring + Lead Capture Form
Ongoing:                Technical debt items above
```

---

> **Tip:** Start with **Google OAuth** — it's the highest trust/effort ratio and makes the app feel production-ready immediately.

> **Note on Infrastructure:** We aim to use **AWS Free Tier** services wherever possible (e.g., S3 for file storage, SES for emails if migrating from Resend, EC2/AppRunner for deployment) to keep hosting costs near zero while maintaining enterprise-grade reliability.

> **Note:** All third-party services currently listed (Resend, Cloudinary, Google OAuth, OpenRouter) have **generous free tiers** — you can build the entire roadmap without spending money.

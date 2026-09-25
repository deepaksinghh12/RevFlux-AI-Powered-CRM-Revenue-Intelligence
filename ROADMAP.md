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
- Analytics overview endpoint (6-month trend, pipeline stats)

---

## 🔐 Priority 1 — Google OAuth Login (Free)

Replace or augment local email/password auth with **Sign in with Google** — zero cost, no extra services needed.

### Why
- Removes friction (no password to remember)
- Users trust it immediately
- Tokens are verified by Google — no password hashing / breach risk

### How it works (high level)
```
User clicks "Sign in with Google"
  → Google returns an ID token (JWT) to the browser
  → Frontend sends it to POST /api/auth/google
  → Backend verifies with google-auth-library
  → Backend issues its own JWT (same flow as local login)
  → Done ✅
```

### Implementation steps

**Backend**
```bash
npm install google-auth-library
```
Add to `.env`:
```
GOOGLE_CLIENT_ID=your-google-client-id   # from console.cloud.google.com (free)
```
New route: `POST /api/auth/google` — verifies Google ID token, finds or creates user, returns JWT.

**Frontend**
```bash
npm install @react-oauth/google
```
Wrap app in `<GoogleOAuthProvider clientId={...}>`, add `<GoogleLogin onSuccess={...} />` button to Login page.

### Effort estimate: ~3–4 hours

---

## 🌟 Upgrade Features (Ranked by Impact)

---

### 1. 📧 Email Sending Integration
**Send emails directly from the CRM** — currently AI only drafts them, you have to copy-paste.

- **Service**: [Resend](https://resend.com) — 3,000 free emails/month
- **Flow**: AI generates draft → user edits in modal → clicks Send → backend calls Resend API
- **Backend**: `npm install resend` · new `POST /api/leads/:id/send-email` route
- **Effort**: ~4 hours

---

### 2. 📊 Advanced Analytics Dashboard
The current overview is basic — expand it with richer charts.

- Win/loss rate by source (LinkedIn, referral, cold outreach, etc.)
- Average deal cycle time (days from New → Won)
- Revenue forecast chart (extrapolate from pipeline value × close probability)
- Top-performing months heatmap
- **Library**: Already using a chart lib — just add more `analyticsApi` endpoints
- **Effort**: ~5 hours

---

### 3. 🔔 Real-time Notifications
Get notified when tasks are due, leads change stage, or team members comment.

- **Tech**: Socket.io (backend) + `socket.io-client` (frontend)
- **Use cases**:
  - "Task overdue: Follow up with Priya Sharma"
  - "Lead moved to Won: Acme Corp ($12,000)"
  - In-app notification bell with unread count
- **Effort**: ~6 hours

---

### 4. 📥 CSV Import / Export
Sales teams live in spreadsheets — let them import their existing leads.

- **Import**: Upload CSV → parse with `papaparse` → bulk insert leads
- **Export**: Download leads/contacts as CSV with current filters applied
- **Effort**: ~3 hours

---

### 5. 📅 Calendar & Follow-up Scheduling
Never miss a follow-up again.

- Task due dates shown on a mini calendar view
- "Schedule follow-up" button on lead detail → creates a Task with a date
- Optional: **Google Calendar sync** via Google Calendar API (free tier)
- **Effort**: ~5 hours

---

### 6. 🏷️ Tags & Smart Filters
Power-user feature for large pipelines.

- Add multiple custom tags to leads (e.g. `hot`, `enterprise`, `needs-demo`)
- Filter pipeline by tag, source, priority, date range simultaneously
- Saved filter presets (e.g. "My hot leads this month")
- **Effort**: ~4 hours

---

### 7. 👥 Team & Role Management
Scale from solo to a real sales team.

- Invite team members by email
- Roles: `owner` / `manager` / `rep`
- Reps only see their own leads; managers see all
- Lead assignment (`assignedTo` field on Lead model)
- **Effort**: ~8 hours

---

### 8. 📎 File Attachments on Leads
Attach contracts, proposals, and call recordings to leads.

- **Storage**: [Cloudinary](https://cloudinary.com) free tier (25 GB) or AWS S3
- Drag-and-drop upload in lead detail panel
- Supported: PDF, DOCX, images
- **Effort**: ~5 hours

---

### 9. 🤖 AI Auto-scoring (Background Job)
Currently AI risk score is generated on demand — automate it.

- Nightly cron job re-scores all leads based on activity (last contact date, notes, stage age)
- Leads that haven't moved in 30 days get flagged as "Stale"
- Dashboard widget: "⚠️ 4 leads need attention"
- **Effort**: ~4 hours

---

### 10. 🌐 Public Lead Capture Form
Generate a shareable link — prospects fill a form and land directly in your pipeline.

- `GET /forms/:token` — public, no auth required
- Form submits to `POST /api/leads/capture/:token`
- Lead auto-created with status `New`, owner set to the user who generated the link
- **Effort**: ~4 hours

---

## 🗂️ Technical Debt & Quality-of-Life

| Task | Priority | Effort |
|---|---|---|
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

> **Note:** All third-party services listed (Resend, Cloudinary, Google OAuth, OpenRouter) have **generous free tiers** — you can build the entire roadmap without spending money.

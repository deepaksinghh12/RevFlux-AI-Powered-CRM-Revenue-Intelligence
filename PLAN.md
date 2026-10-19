# ROLE & OBJECTIVE
You are a Principal Full-Stack Engineer working on **RevFlux**, a multi-tenant AI-powered B2B SaaS CRM (MERN stack, Vite, Tailwind CSS v4, Socket.IO, OpenRouter/Gemini, Resend, Cloudinary).

We recently completed a comprehensive security and architecture audit of the repository. Your task is to execute a structured, phased remediation and stabilization plan across the backend and frontend.

## ⚠️ CRITICAL CONSTRAINT: PAYMENT GATEWAY (DO NOT INTEGRATE LIVE RAZORPAY SDK)
- The current simulated/bypass payment flow in `SubscriptionModal.jsx` and `auth.controller.js` (`createRazorpayOrder` & `subscribePlan`) is **100% INTENTIONAL** for demo purposes because we do not have live Razorpay API keys yet.
- **DO NOT** integrate live Razorpay SDKs, external checkout scripts, or require live `RAZORPAY_KEY_SECRET` verification. Keep the simulated demo checkout UI and mock order/payment ID generation intact!
- **HOWEVER**, you MUST fix the schema validation bug (`"business"` vs `"enterprise"`) and the multi-tenant state binding (`activeOrg` vs `user`) so the simulated demo upgrade flow works seamlessly across all 4 plans (`free`, `starter`, `growth`, `business`).

## 🛡️ EXECUTION RULES
1. Execute one phase at a time. After completing each phase, run the backend test suites (`node --test tests/*.test.js`) and frontend build (`npm run build`) to verify zero regressions.
2. Preserve all existing 107 passing tests across `auth.test.js`, `chat.test.js`, `email.test.js`, `member_id.test.js`, `rbac.test.js`, `rbac_matrix.test.js`, `security.test.js`, and `session.test.js`.
3. Never break multi-tenant isolation (`organization: req.organization._id`) or role-based access control (`hasEffectivePermission`).

---

# 📋 PHASED EXECUTION PLAN

## PHASE 1: Demo Billing Fix, CORS Synchronization & Outreach Cadence Remediation (P0 Blockers)

### 1.1 Fix Demo Subscription Plan Validator & Multi-Tenant Billing State
- **File:** `backend/validators/schemas.js`
  - In `authSchemas.subscribe`, change `const validPlans = ["free", "starter", "growth", "enterprise"];` to `const validPlans = ["free", "starter", "growth", "business"];` to match `Organization.js`, `auth.controller.js`, and `pricingConfig.js`.
- **File:** `backend/controllers/auth.controller.js`
  - In `toClientUser`, include `lastPaymentId: m.organization.lastPaymentId || ""` and `lastBilledAt: m.organization.lastBilledAt || null` inside each mapped workspace object in `workspaces`.
- **File:** `frontend/src/components/billing/SubscriptionModal.jsx`
  - Import and destructure `activeOrg` and `refreshSession` from `useAuth()`.
  - Change `selectedPlan` initial state and `activePlanId` to read from `activeOrg?.plan || "free"` instead of `user?.plan || "free"`.
  - Keep the simulated UPI/Card/Netbanking demo checkout flow intact, and ensure `updateUser(res.user)` updates the active workspace plan in state upon completion.
- **File:** `frontend/src/pages/Settings.jsx`
  - In `BillingCard`, fix the lead count fetch: `leadsApi.list()` returns `{ success: true, count, leads }`. Update the `.then((res) => ...)` block to read `res?.count ?? (Array.isArray(res?.leads) ? res.leads.length : 0)`.
  - Read `activeOrg?.lastPaymentId` (with fallback to `user?.lastPaymentId`) when displaying the last verified demo transaction ID.
- **File:** `backend/middleware/plan.middleware.js`
  - In `checkLeadLimit`, filter out soft-deleted leads when counting usage: `await Lead.countDocuments({ organization: org._id, isDeleted: { $ne: true } })`.
  - Enforce `leadLimit` for all plans where `currentLeadCount + incomingBatchSize > leadLimit` (not just `org.plan === "free"`, so `starter`'s 500-lead limit is also respected).

### 1.2 Synchronize WebSocket CORS with Express CORS
- **File:** `backend/utils/socket.js` & `backend/server.js`
  - Update `allowedOrigins` and the `cors.origin` callback in `backend/utils/socket.js` to match `backend/server.js`:
    - Add `"https://revflux.deepaksinghdev.in"` and `"https://www.revflux.deepaksinghdev.in"` to `allowedOrigins`.
    - Allow `(origin && origin.endsWith(".deepaksinghdev.in"))` in the origin check callback alongside `.vercel.app`.

### 1.3 Fix Outreach Cadence Multi-Tenant Scoping & Queue Email Dispatch
- **File:** `backend/models/OutreachSequence.js`
  - In `outreachQueueSchema`, set `organization.required = true`.
- **File:** `backend/controllers/outreach.controller.js`
  - In `triggerCadenceForLead({ userId, lead, triggerType, newStage, riskScore })`:
    - Scope sequence lookup by organization: `OutreachSequence.find({ organization: lead.organization, isActive: true }).populate("template")`.
    - Scope duplicate check in `OutreachQueue.findOne` by `organization: lead.organization`.
    - Include `organization: lead.organization` and `owner: lead.owner || userId` when calling `OutreachQueue.create({...})`.
  - In `sendQueueItem`:
    - Populate `lead` on `queueItem` (`await OutreachQueue.findOne(query).populate("lead")`).
    - If the lead has an email address, dispatch the email using `sendEmail({ category: EMAIL_CATEGORIES.NOTIFICATIONS, to: queueItem.lead.email, subject: queueItem.subject, html: queueItem.body.replace(/\n/g, "<br>"), text: queueItem.body })`.
    - Create a timeline `Note` on the lead (`Note.create({ organization: req.organization._id, owner: req.user._id, lead: queueItem.lead._id, content: \`Email Sent (Outreach Queue):\\n\\nSubject: \${queueItem.subject}\\n\\n\${queueItem.body}\` })`).
    - Then mark `queueItem.status = "sent"` and `queueItem.sentAt = new Date()`.

---

## PHASE 2: Security Hardening, RBAC Ownership & Custom Permission Enforcement (P1)

### 2.1 Eliminate Unescaped RegExp (ReDoS) Vulnerabilities
- **Files:** `backend/controllers/contact.controller.js`, `backend/controllers/note.controller.js`, `backend/services/aiTools.service.js`
  - Import `{ escapeRegex } from "../utils/sanitize.js"`.
  - In `contact.controller.js` (`getContacts`): sanitize `search` via `const rx = new RegExp(escapeRegex(search.trim()), "i");`.
  - In `note.controller.js` (`getNotes`): sanitize `search` via `filter.content = new RegExp(escapeRegex(search.trim()), "i");`.
  - In `aiTools.service.js` (`searchLeads`): sanitize `args.query` via `const safeQuery = escapeRegex(args.query.trim());` before passing to `$regex`.

### 2.2 Fix Rep Ownership Sandboxing & Manager/Owner AI Lead Resolution
- **File:** `backend/controllers/ai.controller.js`
  - In `resolveLead`: Do NOT hardcode `owner: req.user._id` for all roles (which currently blocks Owners, Admins, and Managers from running AI summaries or email drafts on their reps' leads!).
  - Instead, build the query as:
    ```js
    const query = { _id: leadId, organization: req.organization._id, isDeleted: { $ne: true } };
    if (req.membership?.role === "rep") {
      query.owner = req.user._id;
    }
    const lead = await Lead.findOne(query);
    ```
  - In `getAttentionLeads`: Similarly, scope `openLeads` and `pendingTasks` by `organization: req.organization._id, isDeleted: { $ne: true }`, and only filter by `owner: userId` if `req.membership?.role === "rep"`.
- **File:** `backend/controllers/lead.controller.js`
  - In `reorderLeads`, `sendLeadEmail`, `uploadAttachment`, and `deleteAttachment`:
    - Add `isDeleted: { $ne: true }` to the lead filter.
    - Enforce `if (req.membership && req.membership.role === "rep") { filter.owner = req.user._id; }` so a `rep` cannot reorder, email, or modify attachments on another rep's lead.
    - In `sendLeadEmail`, include `owner: req.user._id` when creating the automatic `Note` (since `Note.owner` is required by `Note.js`!).

### 2.3 Enforce Custom Permission Overrides in Contact & Task Assignment
- **Files:** `backend/controllers/contact.controller.js`, `backend/controllers/task.controller.js`
  - Import `{ hasEffectivePermission } from "../middleware/rbac.middleware.js"`.
  - In `createContact`, `updateContact`, `createTask`, and `updateTask`, replace manual `ROLE_PERMISSIONS[userRole]` checks with `const hasAssignPerm = hasEffectivePermission(req.membership, PERMISSIONS.LEADS_ASSIGN);`.

### 2.4 Consolidate Duplicate Rate Limiters & Prevent Memory Leaks
- **Files:** `backend/middleware/rateLimit.middleware.js`, `backend/server.js`, `backend/routes/auth.routes.js`, `backend/routes/ai.routes.js`
  - In `backend/middleware/rateLimit.middleware.js`, add a periodic cleanup interval (`.unref()`) to `createRateLimiter` that deletes expired IP entries from `ipStore` so memory never grows unbounded.
  - Remove the redundant `authLimiter` and `aiLimiter` mounts in `backend/server.js` (or align the thresholds with `authRateLimiter` and `aiRateLimiter` in the route files) so requests are not double-counted per IP.

---

## PHASE 3: AI Service & Frontend UI Contract Alignment (P1)

### 3.1 Align `generateSalesInsights` with `AiInsightsCard.jsx`
- **File:** `backend/services/ai.service.js` & `frontend/src/components/ai/AiInsightsCard.jsx`
  - Update `generateSalesInsights` in `backend/services/ai.service.js` so the JSON output includes both the existing keys and the exact fields expected by `AiInsightsCard.jsx`:
    - `healthScore`: integer 0–100 indicating overall pipeline health
    - `headline`: 1-sentence executive headline (alias/mapped with `overview`)
    - `insights`: array of 3–4 short string observations about the pipeline
    - `recommendations`: array of 3–4 short string action items
    - Keep `overview`, `topOpportunities`, `risks`, and `forecastNote` for backward compatibility.

### 3.2 Align `generateLeadSummary` with `LeadDrawer.jsx` & `LeadDetail.jsx`
- **File:** `backend/services/ai.service.js` & `frontend/src/components/leads/LeadDrawer.jsx`
  - Update `generateLeadSummary` in `backend/services/ai.service.js` to return:
    - `summary`: 2–3 sentence summary
    - `aiRiskScore`: integer 0–100
    - `riskScore`: integer 0–100 (mirror of `aiRiskScore` for UI compatibility)
    - `suggestedPriority`: `"High" | "Medium" | "Low"`
    - `insights`: array of 3 short bullet strings
    - `recommendedAction`: single sentence on best next step
    - `nextBestAction`: mirror of `recommendedAction` for `LeadDrawer.jsx`

### 3.3 Align `getAttentionLeads` with `AiAttentionCenter.jsx`
- **File:** `backend/controllers/ai.controller.js` & `frontend/src/components/dashboard/AiAttentionCenter.jsx`
  - In `getAttentionLeads` (`backend/controllers/ai.controller.js`), include `attentionReason: reasons[0] || "Standard follow-up cadence recommended"` alongside the `reasons` array on each returned lead object so `AttentionLeadCard` displays the primary risk reason accurately.

---

## PHASE 4: Cron Job Fix, Seed Script Repair & Repo Hygiene (P2 / P3)

### 4.1 Fix Nightly Auto-Scoring Cron Job (`backend/jobs/autoScoring.js`)
- In `startAutoScoringJob`:
  - Filter out soft-deleted leads: `isDeleted: { $ne: true }`.
  - When updating stale leads, **do not** lower `priority` to `"Low"` (stale open deals at risk should either keep their priority or escalate) and **do not** overwrite `updatedAt: new Date()` in a way that tricks `getAttentionLeads` into thinking a human rep interacted with the lead today. Instead, trigger `triggerCadenceForLead({ userId: lead.owner, lead, triggerType: "at_risk", riskScore: newScore })`.

### 4.2 Repair Legacy `backend/seed.js` for Multi-Tenancy
- In `backend/seed.js`:
  - In `seedUserData(user)`, ensure the user has an `Organization` (code `"DEMO"`) and an active `"owner"` `OrganizationMembership`.
  - Pass `organization: org._id` into every `Lead.create`, `Contact.create`, `Note.create`, and `Task.create` call (and `Lead.deleteMany({ organization: org._id })`, etc.) so `npm run seed` runs cleanly without Mongoose validation errors.

### 4.3 Standardize Port Configuration & Clean Up Dead Files
- Update `backend/Dockerfile` and `docker-compose.yml` to use port `8080` (matching `backend/server.js` and `frontend/.env.example`), or document `PORT=8080` consistently.
- Remove committed temporary codemod files if present (`scratch/`, `frontend/script.js`, `frontend/script2.py`) and redundant `backend/services/ai.services.js` (update any imports to `ai.service.js`).

---

# ✅ VERIFICATION DELIVERABLES
After completing Phases 1 through 4:
1. Run all backend test suites (`node --test tests/*.test.js`) and add unit assertions for:
   - Subscribing to the `"business"` plan via `POST /api/auth/subscribe`.
   - Manager/Owner calling `POST /api/ai/lead-summary` on a rep-owned lead.
   - Rep being blocked from reordering or uploading attachments to another rep's lead.
   - Outreach cadence creating an `OutreachQueue` item with `organization` populated.
2. Run `npm run build` in `frontend/` and confirm 0 build or lint errors.
3. Provide a concise summary of all modified files and test results.
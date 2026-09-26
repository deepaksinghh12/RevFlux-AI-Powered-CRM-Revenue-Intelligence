# RevFlux Backend API Server ⚙️

> Production Node.js & Express REST API powering RevFlux SaaS CRM with authentication, AI lead risk scoring, plan gating, file uploads, and Socket.io WebSockets.

---

## 📁 Directory Structure

```
backend/
├── config/
│   ├── db.js                 # MongoDB Mongoose connection handler
│   └── cloudinary.js         # Cloudinary v2 SDK configuration
├── controllers/
│   ├── auth.controller.js    # Register, login, Google OAuth, profile, seed demo, subscribe
│   ├── lead.controller.js    # CRUD, activity timeline, search, email sending, attachments
│   ├── ai.controller.js      # Attention center, lead summary, email generator, sales insights
│   ├── contact.controller.js # Contact management CRUD
│   ├── task.controller.js    # Follow-up task scheduling and updates
│   ├── note.controller.js    # Sales notes management
│   └── analytics.controller.js # Revenue pipeline analytics & forecast
├── middleware/
│   ├── auth.middleware.js    # JWT bearer token verification
│   ├── plan.middleware.js    # Usage-based plan gating (checkLeadLimit)
│   ├── validate.middleware.js # Schema validation middleware runner
│   ├── rateLimit.middleware.js# Sliding-window IP rate limiter
│   ├── upload.middleware.js  # Multer memory storage file upload parser
│   └── error.middleware.js   # Global error handling middleware
├── models/
│   ├── User.js               # User schema (auth, plan, limits)
│   ├── Lead.js               # Lead schema (status, value, aiRiskScore, tags)
│   ├── Contact.js            # Lead contact schema
│   ├── Task.js               # Task schedule schema
│   └── Note.js               # Sales note schema
├── routes/
│   ├── auth.routes.js        # Auth, profile, subscription endpoints
│   ├── lead.routes.js        # Lead CRUD, bulk import, attachments, timeline
│   ├── ai.routes.js          # Attention center & LLM draft endpoints
│   ├── contact.routes.js     # Contact endpoints
│   ├── task.routes.js        # Task endpoints
│   ├── note.routes.js        # Note endpoints
│   └── analytics.routes.js  # Revenue analytics endpoints
├── validators/
│   └── schemas.js            # Auth, Lead, and Subscription validation schemas
├── utils/
│   ├── ApiError.js           # Custom API error class
│   ├── asyncHandler.js       # Express async route wrapper
│   ├── sanitize.js           # ReDoS regex escaping utility
│   └── socket.js             # Socket.io singleton manager
├── jobs/
│   └── autoScoring.js        # Background node-cron job for stale lead scoring
├── Dockerfile                # Multi-stage production Docker image
├── server.js                 # App entry point, HTTP server & Socket.io initialization
└── seed.js                   # Seed script populating 1 year of realistic demo data
```

---

## 🛡️ Security Architecture & Middleware Stack

1. **ReDoS Sanitization**: User search parameters are escaped using `escapeRegex` in `backend/utils/sanitize.js` to prevent regular expression backtracking attacks.
2. **Sliding-Window Rate Limiting**: In-memory IP tracking in `backend/middleware/rateLimit.middleware.js`:
   - `authRateLimiter`: 25 requests per 15 minutes for `/api/auth/*`.
   - `aiRateLimiter`: 50 requests per 15 minutes for `/api/ai/*`.
3. **Plan Gating**: `checkLeadLimit` middleware checks active user lead capacity before processing write actions.
4. **Body Validation**: `validateBody` validates request payloads against schemas in `validators/schemas.js`.

---

## 🌐 API Endpoint Summary

| Category | Method | Endpoint | Description | Auth Required |
|---|---|---|---|---|
| **Auth** | POST | `/api/auth/register` | Register new workspace user | No |
| **Auth** | POST | `/api/auth/login` | Authenticate user & receive JWT | No |
| **Auth** | POST | `/api/auth/google` | Google OAuth2 ID token login | No |
| **Auth** | GET | `/api/auth/me` | Fetch active user session | Yes |
| **Auth** | POST | `/api/auth/subscribe` | Upgrade plan (Free/Growth/Enterprise) | Yes |
| **Leads** | GET | `/api/leads` | List, filter, sort, & search leads | Yes |
| **Leads** | POST | `/api/leads` | Create new lead (Plan Gated) | Yes |
| **Leads** | GET | `/api/leads/:id` | Fetch single lead details | Yes |
| **Leads** | GET | `/api/leads/:id/activity` | Unified lead activity timeline | Yes |
| **Leads** | POST | `/api/leads/bulk` | Bulk import CSV leads (Plan Gated) | Yes |
| **Leads** | POST | `/api/leads/:id/send-email` | Send lead email via Resend API | Yes |
| **Leads** | POST | `/api/leads/:id/attachments` | Upload attachment file to Cloudinary | Yes |
| **AI** | GET | `/api/ai/attention` | Fetch AI Attention Center risk leads | Yes |
| **AI** | POST | `/api/ai/lead-summary` | Generate executive briefing for lead | Yes |
| **AI** | POST | `/api/ai/generate-email` | Generate AI email draft | Yes |
| **Analytics** | GET | `/api/analytics/dashboard` | Fetch dashboard charts & KPIs | Yes |

---

## 🏃 Local Development

```bash
# Install dependencies
npm install

# Seed 1 year of demo data
npm run seed

# Run in development mode with nodemon
npm run dev
```

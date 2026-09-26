# RevFlux 🚀
**AI-Powered SaaS CRM & Revenue Intelligence Platform**

> RevFlux is an enterprise-ready, interview-proof SaaS CRM designed for fast-moving sales teams. It combines core CRM workflows (leads, contacts, tasks, Kanban pipeline) with AI-native intelligence, automated email drafting, hybrid risk scoring, guided onboarding, tiered subscription billing, and enterprise security hardening.

---

## 🏛️ System Architecture

RevFlux uses a clean, layered Node.js/Express backend and a React 19 frontend designed for zero-latency feedback, high security standards, and production scale.

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
                    │ (Auth, Plan Gating, Rate Limits, Zod)   │
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

## ✨ Key Features & Capability Matrix

### 🎯 1. AI Attention Center & Hybrid Risk Scoring
- **Hybrid Risk Engine**: Deterministic rules evaluate deal age, stage duration, and missing follow-ups to assign 0–100 risk scores with explainable reasons.
- **Attention Center**: Surfaces stagnant leads with 1-click action triggers (*Generate AI Email*, *Schedule Task*).

### 📄 2. Full-Page Lead Detail (`/leads/:id`)
- Unified **Activity Timeline** aggregating notes, tasks, emails sent, and stage transitions (`GET /api/leads/:id/activity`).
- AI Executive Briefing panel, file attachment uploads via Cloudinary, and contact action buttons.

### 📋 3. Kanban Pipeline & Dense Lead Table
- Interactive drag-and-drop deal board powered by `@dnd-kit`.
- Dual view toggle (Dense Table vs. Visual Kanban) with stage filters, multi-field search, and deal value summaries.

### 📂 4. Enterprise CSV Ingestion Pipeline
- 4-step CSV import wizard (`CsvImportDialog.jsx`): Upload, Dynamic Header Auto-Matching, Preview & Validation, and Error-Tolerant Bulk DB Insertion (`insertMany`).

### 🚀 5. Guided Onboarding & 1-Click Demo Sandbox
- 3-step setup wizard (`Onboarding.jsx`) for new team initialization.
- 1-click Demo visitor login (`/demo`) pre-populated with 1 full year of realistic deal data across 34 leads.

### 🌐 6. Public Landing Page & Tiered Pricing
- Public SaaS homepage ([Landing.jsx](file:///D:/coding/crm_dash/frontend/src/pages/Landing.jsx)) featuring a **Dynamic Typewriter Heading** (*"Stop Losing Sales Leads"* / *"Automate Follow-ups with AI"*), hero dashboard mockups, and About Us company values.
- Tiered Pricing page ([Pricing.jsx](file:///D:/coding/crm_dash/frontend/src/pages/Pricing.jsx)) with monthly/annual discount toggles.

### 💳 7. Subscription Billing & Plan Gating
- `checkLeadLimit` middleware protecting lead creation endpoints against tier limits (Free: 50, Growth: 500, Enterprise: 10,000+).
- In-app `SubscriptionModal.jsx` and `BillingCard` on the Settings page.

### 🛡️ 8. Legal Center & Enterprise Hardening
- **Legal Trust Center**: Unified [Legal.jsx](file:///D:/coding/crm_dash/frontend/src/pages/Legal.jsx) supporting Privacy Policy (`/privacy`), Terms of Service (`/terms`), and Security Architecture (`/security`).
- **ReDoS Protection**: `escapeRegex` utility sanitizing search queries.
- **Rate Limiting**: Sliding-window in-memory IP rate limiters on Auth (`/api/auth/*`) and AI (`/api/ai/*`) routes.
- **Validation**: Strict schema validation middleware (`validateBody`).
- **Containerization**: Multi-stage `Dockerfile` (backend & frontend) and production `docker-compose.yml`.

---

## 📂 Documentation Sitemap

- 📘 **[Architecture & Concepts Guide](./REVFLUX_ARCHITECTURE_AND_CONCEPTS.md)** — Comprehensive technical guide, design patterns, and interview Q&A.
- ⚙️ **[Backend Documentation](./backend/README.md)** — Express architecture, schema models, security middleware, and API endpoints.
- 🎨 **[Frontend Documentation](./frontend/README.md)** — React 19 components, page routes, state management, and design system.

---

## 🛠️ Local Setup & Docker Deployment

### 🐳 Option A: 1-Command Docker Setup (Recommended)
```bash
docker-compose up --build
```
Access the application at `http://localhost` (Frontend) and `http://localhost:5000` (Backend API).

---

### 💻 Option B: Manual Local Setup

#### 1. Backend Setup
```bash
cd backend
npm install
```

Create `.env` in `backend/`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
RESEND_API_KEY=your-resend-key
GOOGLE_CLIENT_ID=your-google-client-id
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

Seed 1 year of demo data:
```bash
npm run seed
```

Start dev server:
```bash
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Start dev server:
```bash
npm run dev
```

---

## 📄 License
Copyright © 2026 RevFlux Inc. All rights reserved.

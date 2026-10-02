# RevFlux 🚀
**AI-Powered SaaS CRM & Revenue Intelligence Platform**

> RevFlux is an enterprise-ready, interview-proof SaaS CRM designed for fast-moving B2B sales teams. It bridges the gap between traditional pipeline management and modern AI automation. It combines core CRM workflows (Kanban boards, task management, CSV ingestion) with real-time Socket.io collaboration, a context-aware AI Copilot, and intelligent pipeline risk scoring.

---

## 🏛️ System Architecture & Tech Stack

RevFlux uses a clean, decoupled **MERN stack** (MongoDB, Express, React, Node.js) designed for zero-latency feedback, high security standards, and production scale.

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React (Icons), Recharts (Data Viz), React Joyride (Onboarding), Socket.io-client (Real-time).
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io (WebSockets), Zod (Schema Validation).
- **AI Integrations**: OpenRouter / Google Gemini API (LLM for Copilot & Risk Scoring).
- **External Services**: Cloudinary (File storage), Resend (Transactional Emails), Google OAuth (SSO).

```text
                    ┌─────────────────────────────────────────┐
                    │               Browser Client            │
                    │      (React 19 + Tailwind + Socket.io)  │
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

### 🤖 1. AI Copilot & Generative Intelligence
- **Context-Aware Chat Drawer**: A sliding conversational Copilot that automatically ingests your current CRM pipeline context (win rates, top deals, revenue goals) to answer questions and draft follow-ups.
- **AI Attention Center**: Evaluates deal age, stage duration, and missing follow-ups to assign 0–100 risk scores with explainable reasons. Surfaces stagnant leads with 1-click action triggers.
- **Email Drafter**: Auto-generates personalized outreach emails based on lead context and desired tone.

### ⚡ 2. Real-Time Collaboration & Navigation
- **Live Team Chat**: Operators can communicate in real-time via a floating Socket.io-powered chat room widget, complete with typing indicators and unread badges.
- **Global Command Palette**: Hit `Cmd+K` / `Ctrl+K` from anywhere in the app to instantly search and jump between pages, pipelines, and settings.
- **Interactive Product Tour**: Built-in `react-joyride` product tour guiding new users through the dashboard upon completing the onboarding wizard.

### 📊 3. Pipeline Management & Dashboard Analytics
- **Dashboard Grid**: A clean 3-column masonry layout featuring Revenue Goal tracking with Month-over-Month (MoM) badges, Pipeline Engagement charts, and a Top-Row Metrics ribbon (Win Rate, Avg Deal Cycle).
- **Kanban & Dense Table**: Interactive drag-and-drop deal board powered by `@dnd-kit`. Dual view toggle (Table vs. Kanban) with stage filters and deal value summaries.
- **Full-Page Lead Detail (`/leads/:id`)**: Unified Activity Timeline aggregating notes, tasks, emails sent, and stage transitions.

### 📂 4. Enterprise Data Ingestion
- **CSV Import Pipeline**: 4-step wizard to upload, dynamically map headers, preview validation errors, and execute fault-tolerant bulk insertions (`insertMany`).
- **Seed Sandbox Data**: 1-click settings trigger to pre-populate the workspace with 2 years of realistic, randomized lead data and active tasks.

### 💳 5. Public Pages, Billing & Security
- **SaaS Homepage & Pricing**: Public landing page featuring dynamic typewriter headlines, feature grids, and tiered subscription pricing cards.
- **Subscription Gating**: Middleware protecting lead creation endpoints against tier limits (Free: 50, Growth: 500, Enterprise: 10,000+).
- **Enterprise Hardening**: Rate limiting, ReDoS protection (`escapeRegex`), Zod schema validation, and unified Legal/Trust Center components.

---

## 📂 Documentation Sitemap

- 📘 **[Architecture & Concepts Guide](./REVFLUX_ARCHITECTURE_AND_CONCEPTS.md)** — Comprehensive technical guide, design patterns, and system logic.
- 🚀 **[MVP Plan & Roadmap](./revflux-mvp-plan.md)** — Project scoping and phase implementations.

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
```

Seed 2 years of demo data:
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
npm install --legacy-peer-deps
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

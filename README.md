# RevFlux 🚀
**AI-Powered CRM & Revenue Intelligence Platform**

> RevFlux helps small sales teams stop losing leads and follow-ups by combining CRM, AI sales intelligence, and actionable follow-up management.

---

## 🏛️ System Architecture

RevFlux is built using a clean, layered Node.js/Express backend and React 19 frontend designed for speed, scale, and clear interview-proof software engineering principles.

```
[ React 19 Client ]  ◄──(Axios + Socket.io)──►  [ Express API Gateway ]
        │                                              │
        ├── Vite + Tailwind v4                         ├── Auth (JWT + Google OAuth)
        ├── @dnd-kit Kanban                            ├── Node-cron Background Daemon
        ├── Recharts Analytics                         ├── Resend Email Delivery
        └── React Big Calendar                         ├── Cloudinary Document Storage
                                                       └── OpenRouter LLM Engine (GPT-4o-mini)
                                                               │
                                                               ▼
                                                       [ MongoDB Atlas ]
```

### Stack Breakdown

- **Frontend**: React 19, Vite, Tailwind CSS v4, `@dnd-kit` drag-and-drop, Recharts, React Big Calendar, Lucide React, PapaParse.
- **Backend Architecture**: Layered Express architecture (`Route` -> `Middleware` -> `Controller` -> `Service` -> `Mongoose Model`).
- **Database**: MongoDB Atlas with schemas for `User`, `Lead`, `Contact`, `Task`, `Note`.
- **Authentication**: JWT authentication with local password hashing (`bcryptjs`) & Google OAuth ID token verification (`google-auth-library`).
- **AI Intelligence**: OpenRouter API (`openai/gpt-4o-mini`) using structured JSON outputs for lead briefings, hybrid risk scoring, and email drafting.
- **Real-Time & Async**: Socket.io room-based instant notifications, Node-cron background jobs for automated stale lead scoring, and Resend API for transactional email delivery.
- **File Storage**: Cloudinary v2 SDK with Multer memory storage.

---

## ✨ Key Features & Capabilities

### 1. 🎯 AI Attention Center & Risk Scoring
- Hybrid risk scoring engine combining deterministic business rules (inactivity duration, stage stagnation, missing follow-ups) with LLM action recommendations.
- Dashboard Attention Center surfacing high-risk deals with explainable reasons and one-click action triggers.

### 2. 📋 Lead Pipeline & Kanban Board
- Interactive drag-and-drop Kanban pipeline using `@dnd-kit`.
- Dual view: Dense Table vs. Visual Kanban with live stage updates and bulk operations.
- Tagging, multi-field search, priority indicators, and deal value metrics.

### 3. 📅 Follow-up Scheduling & Calendar
- Full-screen task calendar powered by `react-big-calendar`.
- Timeline-grouped task management (Overdue, Due Today, Upcoming, Completed).
- One-click follow-up scheduling directly from lead details.

### 4. ✉️ AI-Assisted Email Communication
- AI-generated personalized outreach drafts injected with real lead and sender profile data.
- Send real emails directly via Resend with auto-created timeline Notes for full audit trails.

### 5. 📂 Bulk Data Ingestion & Storage
- CSV bulk lead import and export with client-side parsing.
- Drag-and-drop file attachments (PDFs, Docs, Images) stored securely on Cloudinary.

### 6. 🌐 Public Lead Capture
- Shareable unauthenticated lead capture form (`/forms/:ownerId`) with instant Socket.io notification to the lead owner's dashboard upon submission.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Backend Setup
```bash
cd backend
npm install
```

Create `.env` in `backend/`:
```env
PORT=8080
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
RESEND_API_KEY=your-resend-key
GOOGLE_CLIENT_ID=your-google-client-id
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

Seed initial demo data:
```bash
npm run seed
```

Start dev server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` in `frontend/`:
```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Start dev server:
```bash
npm run dev
```

---

## 📄 License & Roadmap
For detailed sprint timelines, commercial positioning, and enterprise architecture roadmap, see [`ROADMAP.md`](./ROADMAP.md).

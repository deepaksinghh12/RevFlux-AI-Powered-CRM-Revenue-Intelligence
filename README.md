# RevFlux 🚀
**AI-Powered CRM & Revenue Intelligence Platform**

RevFlux is a modern, lightweight Customer Relationship Management (CRM) system built for sales teams who want to close deals faster. It unifies leads, contacts, and follow-ups, and leverages artificial intelligence to provide strategic sales insights, draft outreach emails, and score lead risks.

---

## 🏗️ Architecture

RevFlux is built using a modern MERN-like stack with a strong emphasis on speed, free-tier cloud services, and clean UI/UX.

### Frontend (Client)
- **Framework**: React 18 (bootstrapped with Vite)
- **Styling**: Tailwind CSS for utility-first styling and a highly responsive design.
- **Icons & UI**: Lucide React for consistent iconography. Custom-built components mimicking high-end fintech dashboards.
- **Data Fetching**: Axios interceptors with local storage JWT management.
- **Key Libraries**: `react-big-calendar` (scheduling), `papaparse` (CSV handling), `recharts` (analytics data visualization).

### Backend (Server)
- **Framework**: Node.js with Express.js
- **Database**: MongoDB (via Mongoose ODM) with a normalized schema (`User`, `Lead`, `Contact`, `Task`, `Note`).
- **Authentication**: Dual-layer strategy featuring local JWT-based Auth and **Google OAuth** (via `google-auth-library`).

### Integrations & Services
- **AI Engine**: OpenRouter (using OpenAI's `gpt-4o-mini` model) for generating contextual intelligence.
- **Email Delivery**: Resend API for sending real transactional emails directly from the CRM.

---

## ✨ Core Features

### 1. Lead Pipeline & Kanban
- Visualize your deals progressing through stages (New, Qualified, Proposal, Won, Lost).
- Toggle between a dense Table view and a Kanban Grid view.
- Track Deal Value and calculate overall pipeline health.

### 2. AI Intelligence Layer
- **Lead Summarization**: Instantly read through a prospect's history and notes to generate a concise briefing.
- **Next Best Action**: The AI evaluates the lead's current stage and suggests the exact next step to take.
- **Risk Scoring**: AI assigns a 0-100 risk score to prevent deals from slipping through the cracks.
- **AI Email Drafting**: Generate hyper-personalized sales outreach emails based on the lead's context, then send them instantly via Resend.

### 3. Smart Filtering & Organization
- **Custom Tags**: Add custom tags (`enterprise`, `hot`, `software`) to leads.
- **Unified Search**: Search instantly by name, company, email, or tag.
- **CSV Data Portability**: Import thousands of leads instantly using the CSV Uploader, or export your filtered views.

### 4. Calendar & Task Management
- Full-screen Calendar UI toggling between Month/Week/Day views.
- Schedule follow-ups linked to specific leads.
- Never miss a meeting with priority-color-coded events.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB connection string (Atlas or Local)

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=8080
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
RESEND_API_KEY=your-resend-key
GOOGLE_CLIENT_ID=your-google-client-id
```
Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```
Start the Vite development server:
```bash
npm run dev
```

---

## 🔮 Future Upcomings (Roadmap)

RevFlux is constantly evolving. Here is a look at what is coming next in our sprints:

1. **📊 Advanced Analytics Dashboard**: Adding deeper insights into Win/Loss rates, average deal cycle times, and top-performing months.
2. **🔔 Real-time Notifications**: Implementing WebSockets (`Socket.io`) for live in-app alerts when tasks are due or deals close.
3. **🏢 Enterprise Multi-Tenancy**: Shifting to an `orgId` scoped Workspace model with Admin/Manager/Rep RBAC.
4. **⚙️ Event-Driven AI Queues**: Integrating `BullMQ` and Redis to handle heavy AI tasks asynchronously.
5. **🧠 Semantic Vector Search (RAG)**: Using MongoDB Atlas Vector Search to allow reps to query the pipeline using natural language ("Which leads mentioned budget limits?").

*(For detailed timelines, see `ROADMAP.md`)*

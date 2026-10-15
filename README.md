# RevFlux 🚀
**AI-Powered SaaS CRM & Revenue Intelligence Platform**

> RevFlux is a multi-tenant SaaS CRM for B2B sales teams, bringing pipeline management, AI-assisted workflows, real-time collaboration, and revenue intelligence into one workspace. It is designed to help teams understand deal context, spot potential risks, and decide what to do next.

[Live Application](https://revflux.deepaksinghdev.in) · [Architecture & Concepts](./REVFLUX_ARCHITECTURE_AND_CONCEPTS.md) · [Roadmap](./ROADMAP.md)

---

## 🏛️ System Architecture & Tech Stack

RevFlux uses a decoupled **MERN stack** (MongoDB, Express, React, Node.js), with real-time communication and external AI and productivity services.

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, React Joyride, Socket.IO Client.
- **Backend:** Node.js, Express.js, MongoDB with Mongoose, Socket.IO, Zod validation.
- **AI integrations:** OpenRouter / Google Gemini API for Copilot, email drafting, and deal-risk workflows.
- **External services:** Cloudinary for file storage, Resend for transactional email, Google OAuth for sign-in.

```text
                   ┌─────────────────────────────────────────┐
                   │              Browser Client              │
                   │      React 19 · Tailwind · Socket.IO     │
                   └────────────────────┬────────────────────┘
                                        │
                       HTTPS / REST     │    WebSockets
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │           Node.js / Express API          │
                   │ Auth · Validation · Plan Limits · RBAC   │
                   └──────┬──────────┬──────────┬─────────────┘
                          │          │          │
                          ▼          ▼          ▼
                   ┌────────────┐ ┌──────────┐ ┌────────────────┐
                   │ MongoDB    │ │ AI APIs  │ │ External APIs  │
                   │ CRM Data   │ │ Gemini / │ │ Resend /       │
                   │ & Tenants  │ │ OpenRouter│ │ Cloudinary     │
                   └────────────┘ └──────────┘ └────────────────┘
```

---

## ✨ Key Features

### 🤖 1. AI Copilot & Sales Assistance

- **Context-aware Copilot:** Helps users explore relevant CRM and pipeline context and draft follow-ups.
- **Deal-risk insights:** Intended to surface deals that may need attention based on signals such as deal age, stage duration, and missing follow-ups, with reasons that users can review.
- **Email drafting:** Generates personalized outreach drafts from lead context and a requested tone.

AI outputs can be incomplete or incorrect. Review generated messages and recommendations before using them. Results depend on provider availability, configuration, and the context available to the user.

### ⚡ 2. Real-Time Collaboration & Navigation

- **Live team chat:** Socket.IO-powered communication with typing indicators and unread cues where supported.
- **Global command palette:** Use `Cmd+K` / `Ctrl+K` to navigate supported pages, pipelines, and settings.
- **Interactive product tour:** React Joyride onboarding flow to introduce supported dashboard features.

### 📊 3. Pipeline Management & Analytics

- **Pipeline dashboard:** Revenue goals, pipeline engagement charts, and sales metrics where supported by the available data.
- **Kanban and table views:** Drag-and-drop deal management using `@dnd-kit`, with stage filters and deal-value summaries.
- **Lead detail and activity timeline:** A consolidated view of supported notes, tasks, emails, and stage transitions.
- **Pipeline visibility:** Metrics such as win rate and average deal cycle where the underlying data supports them.

### 📂 4. Data Ingestion & Sandbox Workflows

- **CSV import:** A guided workflow for uploading data, mapping headers, previewing validation issues, and importing supported records.
- **Sandbox data:** Development seed data can help exercise the dashboard and workflows. Run seed scripts only against a disposable development database.

### 💳 5. SaaS Foundations, Billing & Security

- **Public product pages:** SaaS landing page, feature information, and tiered pricing presentation.
- **Subscription limits:** Server-side plan and usage checks for supported actions.
- **Validation and request protection:** Zod schema validation, rate limiting, and protections for user-controlled search patterns.
- **Organization-aware access:** Multi-tenant data boundaries and role-based access control (RBAC) are important parts of the architecture and ongoing verification work.

> **Security status:** RBAC and tenant isolation must be verified end-to-end before describing them as fully enforced or using the application with real customer data. In particular, test route permissions, cross-tenant data access, analytics, AI tool ownership, imports/exports, invitations, and Socket.IO room authorization. UI restrictions alone do not provide security.

### 🔐 RBAC & Multi-Tenant Access Principles

RevFlux is intended to let multiple organizations use the application while keeping each organization's records and actions within its authorized boundary.

The access-control model should follow these principles:

1. **Authenticate every protected request.** Resolve the signed-in identity before returning protected information or performing an action.
2. **Validate organization membership.** Do not trust a tenant or organization ID merely because it was sent by the client.
3. **Enforce permissions on the server.** Each protected read or write must check the user's role and the requested action.
4. **Scope every data path.** Apply organization boundaries to lists, individual records, search, dashboards, analytics, imports, exports, and background operations.
5. **Check resource ownership and assignment.** Validate access to individual leads, tasks, and other records, not just the parent page.
6. **Authorize AI tools.** Every record retrieved or modified by an AI workflow must be accessible to the requesting user.
7. **Authorize real-time events.** Verify Socket.IO connections, room joins, and event delivery on the server.
8. **Protect invitations and plan limits.** Validate invitation expiry and use, and enforce subscription limits in backend operations.
9. **Fail closed.** Missing or invalid authorization context must not grant access.

#### Essential security test cases

- A user from Organization A cannot read or change Organization B's records by changing an ID.
- A user cannot bypass permissions by calling an API directly instead of using the UI.
- Analytics, imports, exports, and search results remain tenant-scoped.
- AI tools cannot read or mutate records outside the user's authorized scope.
- Socket.IO clients cannot join unauthorized rooms or receive another tenant's events.
- Revoked, expired, reused, or invalid invitations are rejected.
- Subscription limits cannot be bypassed by directly calling backend endpoints.

These are verification requirements, not claims that every case has already passed. Document actual test coverage and results as implementation progresses.

---

## 📂 Documentation

- 📘 **[Architecture & Concepts Guide](./REVFLUX_ARCHITECTURE_AND_CONCEPTS.md)** — System structure, design patterns, and technical concepts.
- 🗺️ **[Project Roadmap](./ROADMAP.md)** — Planned work and implementation priorities.

---

## 🛠️ Local Setup & Docker Deployment

### Prerequisites

- Git
- Node.js and npm compatible with the project
- MongoDB connection string
- Docker Desktop / Docker Engine with Compose if using Docker
- Credentials for external services you want to enable

### 🐳 Option A: Docker Compose

```bash
git clone https://github.com/deepaksinghh12/RevFlux-AI-Powered-CRM-Revenue-Intelligence.git
cd RevFlux-AI-Powered-CRM-Revenue-Intelligence
docker compose up --build
```

The current setup documents the backend on port `5000`; check `docker-compose.yml` for the exact frontend URL, exposed ports, and required variables.

Stop the services with:

```bash
docker compose down
```

### 💻 Option B: Manual Local Setup

#### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` with the variables required by your local configuration. Example:

```dotenv
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=replace-with-a-long-random-secret
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=openai/gpt-4o-mini
RESEND_API_KEY=your-resend-api-key
```

Start the backend:

```bash
npm run dev
```

If the repository's current backend includes a seed script and you want sample data, inspect the script first and run it only against a disposable development database:

```bash
npm run seed
```

#### 2. Frontend

In another terminal:

```bash
cd frontend
npm install --legacy-peer-deps
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Start the frontend:

```bash
npm run dev
```

The examples above reflect the documented development setup. Verify the current `package.json` scripts, environment-variable names, and `docker-compose.yml` before running the project. Never commit real secrets. Variables prefixed with `VITE_` are exposed to the browser bundle and must not contain private API keys.

---

## 🧭 Current Engineering Priorities

- Complete and test RBAC across all protected routes and actions.
- Verify tenant isolation across record access, analytics, search, AI tools, imports/exports, and real-time events.
- Expand automated integration and authorization tests.
- Keep setup instructions and architecture documentation aligned with the code.
- Add product screenshots and a walkthrough after the relevant workflows are stable.
- Improve deployment checks, error reporting, and observability.

---

## 📄 License

Check the repository for an explicit `LICENSE` file and review its terms before reusing or redistributing the project. A copyright notice alone does not grant an open-source license.

---

<div align="center">

Built by **[Deepak Singh](https://github.com/deepaksinghh12)**

[Portfolio](https://deepaksinghdev.in) · [Live RevFlux](https://revflux.deepaksinghdev.in)

</div>

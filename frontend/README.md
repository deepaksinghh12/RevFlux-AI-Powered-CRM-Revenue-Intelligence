# RevFlux Frontend Web Application 🎨

> Modern, responsive React 19 web application for RevFlux SaaS CRM featuring a visual Kanban pipeline, AI Attention Center, CSV importer, Typewriter Landing page, Legal Trust Center, and live WebSocket updates.

---

## 📁 Directory Structure

```
frontend/
├── public/
│   └── favicon.svg           # Brand gradient sparkle SVG favicon
├── src/
│   ├── components/
│   │   ├── ai/              # AI draft dialogs & sales insight cards
│   │   ├── billing/         # Subscription upgrade modal (SubscriptionModal.jsx)
│   │   ├── calendar/        # Full calendar view component
│   │   ├── common/          # PageHeader, ConfirmDialog, EmptyState, LegalModal
│   │   ├── dashboard/       # HeroCard, AiAttentionCenter component
│   │   ├── layout/          # AppLayout, Sidebar, TopNav, IconRail, ProtectedRoute
│   │   ├── leads/           # LeadDrawer, LeadFormDialog, CsvImportDialog, TaskScheduleDialog
│   │   └── ui/              # Atom design system (Button, Card, Input, Badge, Dialog, Avatar, Tabs)
│   ├── context/
│   │   ├── AuthContext.jsx   # User authentication session & profile state
│   │   └── SocketContext.jsx # Real-time Socket.io event listener state
│   ├── lib/
│   │   ├── api.js           # Axios instance with JWT interceptors
│   │   ├── services.js      # authApi, leadsApi, aiApi, tasksApi, notesApi
│   │   ├── format.js        # Currency, date, relative time formatting
│   │   ├── constants.js     # PIPELINE_STAGES, STAGE_STYLES, PRIORITY_STYLES
│   │   ├── pricingConfig.js # Single-source SaaS pricing tier configuration
│   │   └── utils.js         # Tailwind cn() class merge helper
│   ├── pages/
│   │   ├── auth/            # Login.jsx, Register.jsx
│   │   ├── Dashboard.jsx    # Analytics charts, Attention Center, KPI tiles
│   │   ├── Leads.jsx        # Table/grid lead list with search & filters
│   │   ├── LeadDetail.jsx   # Full-page lead workflow & activity timeline
│   │   ├── Pipeline.jsx     # Drag-and-drop Kanban deal board (@dnd-kit)
│   │   ├── Contacts.jsx     # Contact directory
│   │   ├── Tasks.jsx        # Follow-up task list & calendar toggle
│   │   ├── Notes.jsx        # Sales notes feed
│   │   ├── Settings.jsx     # Profile, Security, BillingCard, Data Reset
│   │   ├── Onboarding.jsx   # 3-step setup wizard
│   │   ├── Demo.jsx         # 1-click demo visitor sandbox login
│   │   ├── Landing.jsx      # Typewriter heading SaaS homepage
│   │   ├── Pricing.jsx      # Tiered billing pricing table
│   │   ├── Legal.jsx        # Privacy Policy, Terms of Service, Security
│   │   └── PublicCaptureForm.jsx # Shareable lead capture page (/forms/:ownerId)
│   ├── App.jsx              # Application routes & layout routing
│   └── main.jsx             # Entry point wrapped in ErrorBoundary
├── Dockerfile               # Multi-stage Nginx production build Dockerfile
└── vite.config.js           # Vite environment configuration
```

---

## 🗺️ Route Directory Map

| Route Path | Component | Access Type | Description |
|---|---|---|---|
| `/` | `Landing.jsx` / `AppLayout` | Public / Protected | Landing page (unauthenticated) or Dashboard (authenticated) |
| `/leads` | `Leads.jsx` | Protected | Lead list view with search, filter, and CSV import |
| `/leads/:id` | `LeadDetail.jsx` | Protected | Full-page lead detail & activity timeline |
| `/pipeline` | `Pipeline.jsx` | Protected | Visual drag-and-drop Kanban deal board |
| `/contacts` | `Contacts.jsx` | Protected | Contacts directory |
| `/tasks` | `Tasks.jsx` | Protected | Follow-up checklist & calendar view |
| `/notes` | `Notes.jsx` | Protected | Sales notes timeline |
| `/settings` | `Settings.jsx` | Protected | Profile, password, billing plan upgrade, sample data reset |
| `/onboarding` | `Onboarding.jsx` | Protected | 3-step setup wizard |
| `/pricing` | `Pricing.jsx` | Public | Tiered SaaS pricing plans |
| `/demo` | `Demo.jsx` | Public | 1-click demo visitor sandbox login |
| `/privacy` | `Legal.jsx` | Public | Privacy Policy |
| `/terms` | `Legal.jsx` | Public | Terms of Service |
| `/security` | `Legal.jsx` | Public | Security Architecture |
| `/forms/:ownerId` | `PublicCaptureForm.jsx` | Public | Shareable lead capture form |

---

## 🎨 UI/UX & Responsive Engineering

1. **Typewriter Heading**: Dynamic typing effect on the landing page hero section cycling through high-converting value propositions.
2. **Mobile-First Responsive Grids**: Flexbox and Tailwind grid breakpoints (`sm`, `md`, `lg`, `xl`) tested across all viewports down to 320px screens.
3. **Error Boundary**: Wrapped in `<ErrorBoundary>` component ([main.jsx](file:///D:/coding/crm_dash/frontend/src/main.jsx)) to prevent white-screen crashes and capture diagnostic logs.

---

## 🏃 Build & Run Commands

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:5173)
npm run dev

# Compile production bundle
npm run build
```

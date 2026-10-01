import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import PublicCaptureForm from "./pages/PublicCaptureForm";
import LeadDetail from "./pages/LeadDetail";
import Onboarding from "./pages/Onboarding";
import Demo from "./pages/Demo";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Legal from "./pages/Legal";
import Outreach from "./pages/Outreach";
import Team from "./pages/Team";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/privacy" element={<Legal />} />
      <Route path="/terms" element={<Legal />} />
      <Route path="/security" element={<Legal />} />
      <Route path="/forms/:ownerId" element={<PublicCaptureForm />} />

      {/* Stand-alone Onboarding Wizard */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Root Route: If logged in -> Dashboard inside AppLayout, if not -> Landing page */}
      <Route
        path="/"
        element={
          user ? (
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          ) : (
            <Landing />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="notes" element={<Notes />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="team" element={<Team />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

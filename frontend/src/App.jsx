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
import { useAuth } from "./context/AuthContext";

function HomeRoute() {
  const { user } = useAuth();
  if (user) {
    return (
      <AppLayout>
        <Dashboard />
      </AppLayout>
    );
  }
  return <Landing />;
}

/* Central route table. Auth routes are public; everything else is wrapped in
   the authenticated AppLayout behind <ProtectedRoute>. */
export default function App() {
  return (
    <Routes>
      {/* Public Home & Marketing */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/forms/:ownerId" element={<PublicCaptureForm />} />

      {/* Private (Stand-alone pages without full AppLayout shell) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Private (Main Workspace Shell) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

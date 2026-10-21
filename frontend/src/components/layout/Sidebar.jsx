import { NavLink, Link } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Contact2,
  KanbanSquare,
  StickyNote,
  CalendarCheck,
  Mail,
  ShieldCheck,
  Shield,
  Settings,
  Sparkles,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";

/* Primary navigation — icon + label rail, matching the reference sidebar. */
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true, permission: "reports.read" },
  { to: "/leads", label: "Leads", icon: Users, permission: "leads.read" },
  { to: "/contacts", label: "Contacts", icon: Contact2, permission: "contacts.read" },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, permission: "leads.read" },
  { to: "/notes", label: "Notes", icon: StickyNote, permission: "notes.read" },
  { to: "/tasks", label: "Follow-ups", icon: CalendarCheck, permission: "tasks.read" },
  { to: "/chat", label: "Team Chat", icon: MessageSquare },
  { to: "/outreach", label: "AI Outreach", icon: Mail, permission: "outreach.manage" },
  { to: "/team", label: "Team & Roles", icon: ShieldCheck, permission: "team.read" },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }) {
  const { user, activeOrg } = useAuth();
  const { hasPermission } = usePermission();

  const visibleNav = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-surface">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 px-6 py-6 transition hover:opacity-85">
        <div className="bg-brand-600 shadow-sm flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold text-ink">RevFlux</span>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3">
        {visibleNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-surface-muted hover:text-ink"
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}

        {import.meta.env.DEV && (
          <NavLink
            to="/qa-workspace"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition mt-3 border border-dashed border-amber-500/30",
                isActive
                  ? "bg-amber-500/10 text-amber-700 border-amber-500/50"
                  : "text-amber-700/80 hover:bg-amber-500/5 hover:text-amber-700"
              )
            }
          >
            <Shield className="h-4 w-4 text-amber-600" />
            RBAC QA Lab
          </NavLink>
        )}
      </nav>

      {/* User Profile / Workspace Identity Display */}
      <div className="border-t border-line p-3">
        <div className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-sm font-bold uppercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
            {activeOrg?.name?.charAt(0) || "W"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {activeOrg?.name || "Workspace"}
            </p>
            <p className="truncate text-xs capitalize text-ink-soft flex items-center gap-1">
              {user?.name} 
              <span className="text-[10px] bg-brand-100 text-brand-700 px-1 rounded ml-1 font-bold uppercase tracking-wider">{activeOrg?.role || "member"}</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

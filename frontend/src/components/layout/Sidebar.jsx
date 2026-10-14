import { useState } from "react";
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
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { usePermission } from "../../hooks/usePermission";
import { Dialog } from "../ui/Dialog";

/* Primary navigation — icon + label rail, matching the reference sidebar. */
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true, permission: "reports.read" },
  { to: "/leads", label: "Leads", icon: Users, permission: "leads.read" },
  { to: "/contacts", label: "Contacts", icon: Contact2, permission: "contacts.read" },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, permission: "leads.read" },
  { to: "/notes", label: "Notes", icon: StickyNote, permission: "notes.read" },
  { to: "/tasks", label: "Follow-ups", icon: CalendarCheck, permission: "tasks.read" },
  { to: "/outreach", label: "AI Outreach", icon: Mail, permission: "outreach.manage" },
  { to: "/team", label: "Team & Roles", icon: ShieldCheck, permission: "team.read" },
];

export function Sidebar({ onNavigate }) {
  const { user, activeOrg, switchOrganization, logout } = useAuth();
  const { hasPermission } = usePermission();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatar, setAvatar] = useState(() => localStorage.getItem("revflux_avatar") || "");

  const displayAvatar = avatar || user?.name?.charAt(0) || "U";
  const DOODLES = ["🐱", "🐶", "🦊", "🐸", "🐻", "🐼", "😎", "🤖"];

  const handleSelectAvatar = (emoji) => {
    setAvatar(emoji);
    localStorage.setItem("revflux_avatar", emoji);
  };

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
      </nav>

      {/* User Profile / Workspace */}
      <div className="border-t border-line p-3">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-muted"
        >
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
        </button>
      </div>

      <Dialog open={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Workspace Options">
        <div className="space-y-6">
          
          {/* Workspace Switcher */}
          {user?.workspaces && user.workspaces.length > 1 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink">Switch Workspace</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {user.workspaces.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setProfileModalOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition text-sm",
                      activeOrg?.id === org.id 
                        ? "bg-brand-50 border border-brand-200 text-brand-800" 
                        : "bg-surface hover:bg-surface-muted text-ink border border-line"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-100 text-[10px] font-bold text-brand-700">
                        {org.name.charAt(0)}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </div>
                    {activeOrg?.id === org.id && <span className="text-xs font-medium text-brand-600">Active</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-line pt-4">
            <h4 className="mb-3 text-sm font-semibold text-ink">Settings</h4>
            <div className="space-y-2">
              <NavLink
                to="/settings"
                onClick={() => {
                  setProfileModalOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-brand-50 hover:text-brand-700"
              >
                <Settings className="h-[18px] w-[18px]" />
                Workspace Settings
              </NavLink>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </aside>
  );
}

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
import { Dialog } from "../ui/Dialog";

/* Primary navigation — icon + label rail, matching the reference sidebar. */
const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/contacts", label: "Contacts", icon: Contact2 },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/tasks", label: "Follow-ups", icon: CalendarCheck },
  { to: "/outreach", label: "AI Outreach", icon: Mail },
  { to: "/team", label: "Team & Roles", icon: ShieldCheck },
];

export function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatar, setAvatar] = useState(() => localStorage.getItem("revflux_avatar") || "");

  const displayAvatar = avatar || user?.name?.charAt(0) || "U";
  const DOODLES = ["🐱", "🐶", "🦊", "🐸", "🐻", "🐼", "😎", "🤖"];

  const handleSelectAvatar = (emoji) => {
    setAvatar(emoji);
    localStorage.setItem("revflux_avatar", emoji);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-surface">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 px-6 py-6 transition hover:opacity-85">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-bold text-ink">RevFlux</span>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
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

      {/* User Profile */}
      <div className="border-t border-line p-3">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-muted"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold uppercase text-brand-700">
            {displayAvatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.name || "My Workspace"}
            </p>
            <p className="truncate text-xs capitalize text-ink-soft">
              {user?.role?.replace("_", " ") || "Sales Rep"}
            </p>
          </div>
        </button>
      </div>

      <Dialog open={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Customize Profile">
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink">Choose Avatar</h4>
            <div className="flex flex-wrap gap-3">
              {DOODLES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectAvatar(emoji)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-2xl transition",
                    avatar === emoji
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-surface hover:border-brand-500 hover:bg-brand-50"
                  )}
                >
                  {emoji}
                </button>
              ))}
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface text-ink-soft transition hover:border-brand-500 hover:text-brand-600">
                <span className="text-xl">+</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">Select a doodle or upload a custom image.</p>
          </div>

          <div className="border-t border-line pt-4">
            <h4 className="mb-3 text-sm font-semibold text-ink">Account Settings</h4>
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

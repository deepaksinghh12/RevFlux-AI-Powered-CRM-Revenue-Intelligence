import { NavLink, useNavigate, Link } from "react-router-dom";
import { Search, Bell, Menu, ChevronDown, User, LogOut, Sparkles } from "lucide-react";
import {
  Avatar,
  IconButton,
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { cn } from "../../lib/utils";

/* Centered text links — a subset of the primary nav, rendered in a white pill
   exactly like the reference top bar. */
const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/leads", label: "Leads" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/contacts", label: "Contacts" },
  { to: "/tasks", label: "Follow-ups" },
];

export function TopNav({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { unreadCount, clearUnread } = useSocket();
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-3">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 pr-2 transition hover:opacity-85">
        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="hidden font-display text-lg font-bold text-ink sm:block">
          RevFlux
        </span>
      </Link>

      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="rounded-xl p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Centered nav pill */}
      <nav className="mx-auto hidden items-center gap-1 rounded-full bg-surface p-1.5 shadow-[var(--shadow-soft)] lg:flex">
        {LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "rounded-full px-5 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-surface-muted text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <IconButton aria-label="Search" className="hidden sm:inline-flex">
          <Search className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton aria-label="Notifications" className="relative" onClick={clearUnread}>
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
              {unreadCount}
            </span>
          )}
        </IconButton>

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition hover:bg-surface-muted">
              <Avatar name={user?.name} src={user?.avatar} size="sm" />
              <ChevronDown className="h-4 w-4 text-ink-soft" />
            </button>
          }
        >
          <DropdownLabel>{user?.email}</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem onClick={() => navigate("/settings")}>
            <User className="h-4 w-4" /> Profile & settings
          </DropdownItem>
          <DropdownItem danger onClick={logout}>
            <LogOut className="h-4 w-4" /> Log out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}

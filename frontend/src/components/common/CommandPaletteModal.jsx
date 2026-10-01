import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutGrid, Users, Contact2, KanbanSquare, StickyNote, CalendarCheck, Mail, ShieldCheck, Settings, Sparkles, Plus } from "lucide-react";
import { Dialog } from "../ui/Dialog";

export function CommandPaletteModal({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const ACTIONS = [
    { label: "Go to Dashboard", icon: LayoutGrid, path: "/" },
    { label: "View All Leads", icon: Users, path: "/leads" },
    { label: "Add New Lead", icon: Plus, path: "/leads" },
    { label: "View Contacts", icon: Contact2, path: "/contacts" },
    { label: "Open Kanban Pipeline", icon: KanbanSquare, path: "/pipeline" },
    { label: "Notes & Transcripts", icon: StickyNote, path: "/notes" },
    { label: "Follow-up Tasks", icon: CalendarCheck, path: "/tasks" },
    { label: "AI Outreach Studio", icon: Mail, path: "/outreach" },
    { label: "Team & Roles (RBAC)", icon: ShieldCheck, path: "/team" },
    { label: "Workspace Settings", icon: Settings, path: "/settings" },
  ];

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action) => {
    navigate(action.path);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl p-0 overflow-hidden">
      <div className="flex items-center border-b border-line px-4 py-3 bg-surface">
        <Search className="h-5 w-5 text-ink-soft mr-3 shrink-0" />
        <input
          type="text"
          placeholder="Search commands, leads, or pages... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-ink outline-hidden placeholder:text-ink-soft"
          autoFocus
        />
        <kbd className="hidden sm:inline-block rounded-md bg-surface-muted px-2 py-1 text-[10px] font-bold text-ink-soft border border-line">
          ESC
        </kbd>
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-soft">No matching commands found.</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(action)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-ink-soft group-hover:bg-brand-100 group-hover:text-brand-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{action.label}</span>
                  </div>
                  <span className="text-[10px] font-medium text-ink-soft group-hover:text-brand-600">Jump →</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-surface-muted px-4 py-2.5 flex items-center justify-between text-[11px] text-ink-soft">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span>RevFlux Global Command Palette</span>
        </div>
        <span>Use <kbd className="font-bold">↑ ↓</kbd> to navigate</span>
      </div>
    </Dialog>
  );
}

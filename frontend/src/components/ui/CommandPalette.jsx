import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Search, User, FileText, CheckSquare, Plus, Home, Users, Settings } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

export function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate();

  // Toggle on Cmd+K or Ctrl+K
  useHotkeys("meta+k, ctrl+k", (e) => {
    e.preventDefault();
    setOpen((o) => !o);
  });

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div 
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm" 
        onClick={() => setOpen(false)}
      />
      
      <div className="relative w-full max-w-xl bg-surface rounded-xl shadow-2xl border border-line overflow-hidden">
        <Command className="w-full">
          <div className="flex items-center px-4 py-3 border-b border-line">
            <Search className="h-5 w-5 text-ink-soft mr-3" />
            <Command.Input 
              autoFocus 
              className="flex-1 bg-transparent text-ink placeholder:text-ink-soft outline-none" 
              placeholder="Type a command or search..." 
            />
            <span className="text-xs font-mono text-ink-soft bg-surface-muted px-1.5 py-0.5 rounded border border-line">ESC</span>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-ink-soft">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-ink-soft px-2 py-1.5">
              <Command.Item 
                onSelect={() => runCommand(() => navigate("/"))}
                className="flex items-center px-3 py-2 text-sm text-ink rounded-lg cursor-pointer hover:bg-brand-50 hover:text-brand-700 data-[selected]:bg-brand-50 data-[selected]:text-brand-700"
              >
                <Home className="h-4 w-4 mr-3" /> Dashboard
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate("/leads"))}
                className="flex items-center px-3 py-2 text-sm text-ink rounded-lg cursor-pointer hover:bg-brand-50 hover:text-brand-700 data-[selected]:bg-brand-50 data-[selected]:text-brand-700"
              >
                <Users className="h-4 w-4 mr-3" /> Leads & Pipeline
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate("/settings"))}
                className="flex items-center px-3 py-2 text-sm text-ink rounded-lg cursor-pointer hover:bg-brand-50 hover:text-brand-700 data-[selected]:bg-brand-50 data-[selected]:text-brand-700"
              >
                <Settings className="h-4 w-4 mr-3" /> Workspace Settings
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Quick Actions" className="text-xs font-semibold text-ink-soft px-2 py-1.5 mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => { navigate("/leads"); setTimeout(() => document.getElementById('new-lead-btn')?.click(), 100); })}
                className="flex items-center px-3 py-2 text-sm text-ink rounded-lg cursor-pointer hover:bg-brand-50 hover:text-brand-700 data-[selected]:bg-brand-50 data-[selected]:text-brand-700"
              >
                <Plus className="h-4 w-4 mr-3" /> Create New Lead
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => navigate("/tasks"))}
                className="flex items-center px-3 py-2 text-sm text-ink rounded-lg cursor-pointer hover:bg-brand-50 hover:text-brand-700 data-[selected]:bg-brand-50 data-[selected]:text-brand-700"
              >
                <CheckSquare className="h-4 w-4 mr-3" /> View Tasks
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

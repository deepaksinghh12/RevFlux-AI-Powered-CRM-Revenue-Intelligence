import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Menu, Search, ChevronRight, Home } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ProductTour } from "../common/ProductTour";
import { TeamChatWidget } from "../common/TeamChatWidget";
import { CommandPalette } from "../ui/CommandPalette";
import { CopilotDrawer } from "../common/CopilotDrawer";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Listen for Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Format breadcrumb paths
  const pathParts = location.pathname.split("/").filter(Boolean);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <ProductTour />
      <CopilotDrawer />
      <TeamChatWidget />
      <CommandPalette open={cmdPaletteOpen} setOpen={setCmdPaletteOpen} />

      {/* Desktop sidebar */}
      <div className="tour-sidebar hidden shrink-0 lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-[slidein_.25s_ease]">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop & Mobile Header with Breadcrumbs & Command Palette */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:px-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <button
              onClick={() => setMobileOpen(true)}
              className="mr-2 text-ink-soft hover:text-ink lg:hidden transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-1 hover:text-brand-600 transition">
              <Home className="h-3.5 w-3.5" />
              <span>RevFlux</span>
            </Link>
            {pathParts.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-line" />}
            {pathParts.map((part, idx) => {
              const routeTo = `/${pathParts.slice(0, idx + 1).join("/")}`;
              const isLast = idx === pathParts.length - 1;
              const formattedPart = part.replace("-", " ");

              return (
                <div key={part} className="flex items-center gap-2 capitalize">
                  {isLast ? (
                    <span className="font-bold text-ink">{formattedPart}</span>
                  ) : (
                    <Link to={routeTo} className="hover:text-brand-600 transition">
                      {formattedPart}
                    </Link>
                  )}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5 text-line" />}
                </div>
              );
            })}
          </div>

          {/* Quick Action Controls & Command Palette button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink-soft shadow-xs transition hover:border-brand-300 hover:text-ink"
            >
              <Search className="h-3.5 w-3.5 text-brand-600" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-surface border border-line px-1.5 py-0.5 text-[10px] font-bold">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 px-4 py-6 md:px-8">
            <Outlet />
          </div>
          
          {/* Global Footer */}
          <footer className="border-t border-line bg-surface/50 px-4 py-6 md:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-xs text-ink-soft">
                &copy; {new Date().getFullYear()} RevFlux CRM. All rights reserved.
              </p>
              <div className="flex gap-4 text-xs font-medium text-ink-soft">
                <Link to="/privacy" className="hover:text-brand-600 transition">Privacy</Link>
                <Link to="/terms" className="hover:text-brand-600 transition">Terms</Link>
                <Link to="/security" className="hover:text-brand-600 transition">Security</Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ProductTour } from "../common/ProductTour";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <ProductTour />
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
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-4 lg:hidden border-b border-line bg-surface">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-ink-soft hover:text-ink transition"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-display font-semibold text-ink">RevFlux</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-base uppercase">
            {localStorage.getItem("revflux_avatar") || user?.name?.charAt(0) || "U"}
          </div>
        </div>
        
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

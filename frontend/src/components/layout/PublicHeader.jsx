import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "../ui";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

export function PublicHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isLanding = location.pathname === "/";

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-surface/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5 group">
          <div className="bg-brand-600 flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold text-ink tracking-tight">RevFlux</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
          {isLanding ? (
            <>
              <a href="#pipeline-pulse" className="hover:text-ink transition-colors">Product</a>
              <a href="#ai-copilot" className="hover:text-ink transition-colors">AI Copilot</a>
              <a href="#features" className="hover:text-ink transition-colors">Features</a>
              <a href="#security" className="hover:text-ink transition-colors">Security</a>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-ink transition-colors">Home</Link>
              <Link to="/#pipeline-pulse" className="hover:text-ink transition-colors">Product</Link>
              <Link to="/#features" className="hover:text-ink transition-colors">Features</Link>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button size="sm" onClick={() => navigate("/")} className="shadow-sm">
              Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="font-medium text-ink hover:bg-surface-muted transition-colors">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-4">
          {!user && (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium text-ink px-2">
                Sign In
              </Button>
            </Link>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-ink-soft hover:text-ink transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-surface absolute w-full pb-4 shadow-lg animate-fade-down animate-duration-200">
          <nav className="flex flex-col px-4 pt-2">
            {isLanding ? (
              <>
                <a href="#pipeline-pulse" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Product</a>
                <a href="#ai-copilot" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">AI Copilot</a>
                <a href="#features" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Features</a>
                <a href="#security" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Security</a>
              </>
            ) : (
              <>
                <Link to="/" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Home</Link>
                <Link to="/#pipeline-pulse" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Product</Link>
                <Link to="/#features" onClick={closeMenu} className="block py-3 text-base font-medium text-ink-soft hover:text-ink border-b border-line/50">Features</Link>
              </>
            )}
            
            <div className="mt-6 flex flex-col gap-3">
              {user ? (
                <Button onClick={() => { closeMenu(); navigate("/"); }} className="w-full justify-center">
                  Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Link to="/register" onClick={closeMenu} className="w-full">
                  <Button className="w-full justify-center shadow-sm">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

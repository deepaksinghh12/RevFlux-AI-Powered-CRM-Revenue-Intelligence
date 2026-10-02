import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "../ui";
import { useAuth } from "../../context/AuthContext";

export function PublicHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const isLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold text-ink">RevFlux</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
          {isLanding ? (
            <>
              <a href="#about" className="hover:text-ink transition">About Us</a>
              <a href="#features" className="hover:text-ink transition">Features</a>
              <a href="#how-it-works" className="hover:text-ink transition">How It Works</a>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-ink transition">Home</Link>
              <Link to="/features" className="hover:text-ink transition">Features</Link>
            </>
          )}
          <Link to="/pricing" className="hover:text-ink transition">Pricing</Link>
          <Link to="/download" className="hover:text-ink transition">Download</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Button size="sm" onClick={() => navigate("/")}>
              Workspace <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/demo")}>
                View Demo
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Start Free
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

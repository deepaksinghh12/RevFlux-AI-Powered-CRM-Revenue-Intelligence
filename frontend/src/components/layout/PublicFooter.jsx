import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-canvas border-t border-line text-sm text-ink-soft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 lg:gap-8">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-brand-600 flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold text-ink">RevFlux</span>
            </Link>
            <div>
              <p className="text-sm font-semibold text-ink">AI-Powered CRM & Revenue Intelligence</p>
              <p className="text-sm leading-relaxed mt-2 text-ink-soft">
                "See what matters.<br/>Know what to do next."
              </p>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Product */}
            <div>
              <h4 className="font-semibold text-ink mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-brand-600 transition-colors">Features</a></li>
                <li><a href="#ai-copilot" className="hover:text-brand-600 transition-colors">AI Copilot</a></li>
                <li><a href="#pipeline-pulse" className="hover:text-brand-600 transition-colors">Pipeline</a></li>
                <li><a href="#features" className="hover:text-brand-600 transition-colors">Lead Management</a></li>
                <li><a href="#security" className="hover:text-brand-600 transition-colors">Security</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-ink mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link to="/register" className="hover:text-brand-600 transition-colors">Getting Started</Link></li>
                <li><a href="mailto:hello@revflux.com" className="hover:text-brand-600 transition-colors">Contact</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">GitHub</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-ink mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#about" className="hover:text-brand-600 transition-colors">About</a></li>
                <li><a href="mailto:hello@revflux.com" className="hover:text-brand-600 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-ink mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#privacy" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-16 pt-8 border-t border-line/60 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-brand-600" />
            <p>© {new Date().getFullYear()} RevFlux. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#status" className="hover:text-ink transition-colors">Status</a>
            <a href="#security" className="hover:text-ink transition-colors">Security</a>
            <a href="mailto:hello@revflux.com" className="hover:text-ink transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

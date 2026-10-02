import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#f8fafc] pt-16 pb-8 border-t border-line text-sm text-ink-soft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Ask about RevFlux Section */}
        <div className="mb-16 flex flex-col lg:flex-row items-center justify-between rounded-3xl bg-white p-8 md:p-10 shadow-xs border border-line">
          <div className="max-w-md text-center lg:text-left mb-8 lg:mb-0">
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
              Ask about RevFlux on
            </h3>
            <p className="mt-3 text-ink-soft text-base leading-relaxed">
              Wondering how RevFlux compares to other CRMs? Ask your favorite AI assistant for an unbiased breakdown of our platform.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 lg:max-w-[50%]">
            {/* ChatGPT */}
            <a 
              href="https://chatgpt.com/?q=What+is+RevFlux+(revflux.com)%3F+Tell+me+about+their+AI-powered+CRM+platform+and+what+makes+it+different." 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="h-5 w-5 fill-current text-ink" viewBox="0 0 24 24"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829v-2.3324a.0757.0757 0 0 1 .0332-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66 4.4708 4.4708 0 0 1-.5346.9015l-.1419-.0852-4.783-2.7582a.7712.7712 0 0 0-.7806 0l-5.8428 3.3685v-2.3324a.0804.0804 0 0 1 .0332-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66z"/></svg>
              <span className="font-semibold text-ink">ChatGPT</span>
            </a>

            {/* Claude */}
            <a 
              href="https://claude.ai/new?q=What+is+RevFlux+(revflux.com)%3F+Tell+me+about+their+AI-powered+CRM+platform+and+what+makes+it+different." 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#D9CEB6] bg-[#F3EFE7] px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="h-5 w-5 fill-[#CC785C]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V14.5l3.22.92-.85 1.5-2.37-1.1v-2.34l-2.07-.6v2.94l2.07 1.17zm.42-7.85l2.08-.6v3l2.36 1.12.86-1.5-3.22-.92v-1.1zM9.54 7.02L7.46 7.62v2.33l-2.08.6V7.6l-2.35-1.1-.86 1.5 3.21.91v3.58l2.08.6V9.95L9.54 9.35z"/></svg>
              <span className="font-semibold text-[#4D4D4D]">Claude</span>
            </a>

            {/* Perplexity */}
            <a 
              href="https://www.perplexity.ai/search?q=What+is+RevFlux+(revflux.com)%3F+Tell+me+about+their+AI-powered+CRM+platform+and+what+makes+it+different." 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="h-5 w-5 fill-[#22B8CD]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5h2v2h-2zm-3 4h2v2H8zm6 0h2v2h-2zm-3 4h2v2h-2z"/></svg>
              <span className="font-semibold text-ink">Perplexity</span>
            </a>

            {/* Grok */}
            <a 
              href="https://x.com/i/grok?text=What+is+RevFlux+(revflux.com)%3F+Tell+me+about+their+AI-powered+CRM+platform+and+what+makes+it+different." 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-gray-800 bg-black text-white px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="font-bold font-display tracking-widest text-lg leading-none">/</span>
              <span className="font-semibold">Grok</span>
            </a>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold text-ink">RevFlux</span>
            </Link>
            <p className="max-w-xs text-sm">
              Smarter sales workflows. Stronger customer relationships. The AI-powered workspace for modern revenue teams.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="https://linkedin.com/company/revflux" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 transition" aria-label="LinkedIn">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://twitter.com/revflux" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 transition" aria-label="X (Twitter)">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/revflux" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 transition" aria-label="GitHub">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </a>
              <a href="https://youtube.com/@revflux" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 transition" aria-label="YouTube">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-ink mb-4">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/features" className="hover:text-brand-600 transition">CRM Dashboard</Link></li>
              <li><Link to="/features" className="hover:text-brand-600 transition">Lead Management</Link></li>
              <li><Link to="/features" className="hover:text-brand-600 transition">AI Sales Copilot</Link></li>
              <li><Link to="/pricing" className="hover:text-brand-600 transition">Pricing</Link></li>
              <li><Link to="/download" className="hover:text-brand-600 transition">Download</Link></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-bold text-ink mb-4">Solutions</h4>
            <ul className="space-y-3">
              <li><Link to="/solutions" className="hover:text-brand-600 transition">For Small Sales Teams</Link></li>
              <li><Link to="/solutions" className="hover:text-brand-600 transition">For Sales Managers</Link></li>
              <li><Link to="/solutions" className="hover:text-brand-600 transition">For B2B Sales Teams</Link></li>
              <li><Link to="/demo" className="hover:text-brand-600 transition">Interactive Demo</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-ink mb-4">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="hover:text-brand-600 transition">About RevFlux</Link></li>
              <li><Link to="/faq" className="hover:text-brand-600 transition">Help Center & FAQ</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-600 transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-brand-600 transition">Terms of Service</Link></li>
              <li><Link to="/security" className="hover:text-brand-600 transition">Security</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-line/60 gap-4">
          <p>© {currentYear} RevFlux Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-ink transition">Privacy</Link>
            <Link to="/terms" className="hover:text-ink transition">Terms</Link>
            <Link to="/security" className="hover:text-ink transition">Cookies</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

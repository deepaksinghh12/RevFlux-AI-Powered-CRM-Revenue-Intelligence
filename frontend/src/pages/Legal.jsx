import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, ShieldCheck, ArrowLeft, FileText, Lock, Scale } from "lucide-react";
import { Button, Badge, Card } from "../components/ui";

export default function Legal() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path or state
  const path = location.pathname.replace("/", "");
  const [tab, setTab] = useState(
    path === "terms" ? "terms" : path === "security" ? "security" : "privacy"
  );

  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-ink">RevFlux</span>
          </Link>

          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        <div className="text-center space-y-3">
          <Badge className="bg-brand-50 text-brand-700 font-semibold px-3 py-1 text-xs">
            Legal & Trust Center
          </Badge>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-ink">
            RevFlux Terms & Policies
          </h1>
          <p className="text-sm sm:text-base text-ink-soft max-w-xl mx-auto">
            Transparency, security, and data privacy are core to how we build RevFlux.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center border-b border-line pb-4 gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setTab("privacy")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition ${
              tab === "privacy"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            <Lock className="h-4 w-4" /> Privacy Policy
          </button>
          <button
            onClick={() => setTab("terms")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition ${
              tab === "terms"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            <Scale className="h-4 w-4" /> Terms of Service
          </button>
          <button
            onClick={() => setTab("security")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition ${
              tab === "security"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-ink-soft hover:bg-surface hover:text-ink"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Security
          </button>
        </div>

        {/* Tab Contents */}
        <Card className="p-6 sm:p-10 space-y-6 text-sm text-ink-soft leading-relaxed">
          {tab === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-ink mb-2">Privacy Policy</h2>
                <p className="text-xs text-ink-soft/70">Last updated: September 27, 2026</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">1. Information We Collect</h3>
                <p>
                  RevFlux collects information you provide directly, including your name, email address, company details, CRM contact records, notes, and task data to deliver our revenue intelligence services.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">2. How We Use Your Data</h3>
                <p>
                  We use collected data solely to power your sales pipeline, calculate AI deal risk scores, generate personalized email drafts via Google Gemini API, and process follow-up reminders.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">3. Data Ownership & Export</h3>
                <p>
                  You retain 100% ownership of your customer and lead data. You can export your entire CRM database as CSV at any time or request permanent account data purge in Settings.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">4. Third-Party Sharing</h3>
                <p>
                  We never sell your data to advertisers or third parties. API data processed for AI summaries is encrypted in transit and never stored for LLM model training.
                </p>
              </div>
            </div>
          )}

          {tab === "terms" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-ink mb-2">Terms of Service</h2>
                <p className="text-xs text-ink-soft/70">Last updated: September 27, 2026</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">1. Acceptance of Terms</h3>
                <p>
                  By registering or using RevFlux, you agree to comply with these terms, usage guidelines, and applicable data privacy regulations.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">2. Subscription & Capacity Limits</h3>
                <p>
                  RevFlux offers Free, Growth, and Enterprise subscription plans. Free accounts are capped at 50 active leads. Exceeding plan capacity requires upgrading to an active paid plan.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">3. User Conduct & Responsible Outreach</h3>
                <p>
                  You agree not to use RevFlux AI email generation features for sending unsolicited spam, deceptive phishing communications, or harmful payloads.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">4. Service Availability</h3>
                <p>
                  We strive for 99.9% platform availability. RevFlux is provided "as is", and we reserve the right to modify or enhance platform features as necessary.
                </p>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-ink mb-2">Security Architecture</h2>
                <p className="text-xs text-ink-soft/70">Last updated: September 27, 2026</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">1. Encryption Standards</h3>
                <p>
                  All network traffic is encrypted in transit using TLS 1.3 (HTTPS). Sensitive database fields and authentication tokens are encrypted at rest using 256-bit AES encryption.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">2. Authentication & Passwords</h3>
                <p>
                  User passwords are hashed using bcrypt with adaptive salt rounds. We support secure Google OAuth2 single sign-on for enterprise workspaces.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-ink">3. Database Isolation</h3>
                <p>
                  RevFlux enforces strict multi-tenant authorization controls at the API middleware layer, ensuring your workspace leads and contact notes remain strictly isolated.
                </p>
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-6 text-center text-xs text-ink-soft">
        <p>© 2026 RevFlux Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

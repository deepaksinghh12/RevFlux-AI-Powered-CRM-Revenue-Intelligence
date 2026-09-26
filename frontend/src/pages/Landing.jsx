import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  KanbanSquare,
  Mail,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TrendingUp,
  Play,
} from "lucide-react";
import { Button, Card, Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const PHRASES = [
  "Stop Losing Sales Leads.",
  "Automate Follow-ups with AI.",
  "Prioritize High-Risk Deals.",
  "Close Revenue 35% Faster.",
];

function TypewriterText() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = PHRASES[phraseIdx];
    let speed = isDeleting ? 35 : 75;

    if (!isDeleting && currentText === fullText) {
      const pauseTimer = setTimeout(() => setIsDeleting(true), 2200);
      return () => clearTimeout(pauseTimer);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % PHRASES.length);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentText(
        isDeleting
          ? fullText.substring(0, currentText.length - 1)
          : fullText.substring(0, currentText.length + 1)
      );
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIdx]);

  return (
    <span className="inline-block">
      <span className="bg-linear-to-r from-brand-600 via-brand-700 to-emerald-600 bg-clip-text text-transparent">
        {currentText}
      </span>
      <span className="ml-1.5 inline-block h-7 w-1 animate-pulse bg-brand-600 align-baseline sm:h-12 lg:h-14" />
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-surface-muted text-ink">
      {/* ── Public Navbar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-ink">RevFlux</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
            <a href="#about" className="hover:text-ink transition">About Us</a>
            <a href="#features" className="hover:text-ink transition">Features</a>
            <a href="#how-it-works" className="hover:text-ink transition">How It Works</a>
            <Link to="/pricing" className="hover:text-ink transition">Pricing</Link>
            <a href="#faq" className="hover:text-ink transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Button size="sm" onClick={() => navigate("/")}>
                Workspace <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/demo")}>
                  <Play className="h-3.5 w-3.5 fill-current text-brand-600" /> View Demo
                </Button>
                <Button size="sm" onClick={() => navigate("/register")}>
                  Start Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-14 sm:pt-20 pb-12 sm:pb-16 lg:pt-24 lg:pb-24">
        {/* Background Ambient Glow */}
        <div className="absolute left-1/2 top-10 -z-10 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <Badge className="bg-brand-50 text-brand-700 mb-4 sm:mb-6 font-semibold px-3 py-1 text-[11px] sm:text-xs">
            ✨ AI-Powered Revenue Intelligence Platform
          </Badge>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-7xl leading-tight min-h-[85px] sm:min-h-[140px] flex items-center justify-center">
            <TypewriterText />
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-ink-soft max-w-3xl mx-auto leading-relaxed">
            RevFlux helps small sales teams organize leads, automate follow-ups, and use AI to decide what to do next.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold" onClick={() => navigate("/register")}>
              Start Free Trial <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold" onClick={() => navigate("/demo")}>
              <Play className="h-4 w-4 fill-current mr-1 text-brand-600" /> View Demo Workspace
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-medium text-ink-soft">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Free 14-day trial</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Set up in 2 minutes</span>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-14 mx-auto max-w-6xl px-6">
          <div className="overflow-hidden rounded-3xl border border-line bg-surface p-3 shadow-2xl">
            <div className="rounded-2xl border border-line/60 bg-surface-muted/50 p-6 text-left">
              <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-ink-soft">revflux.app/dashboard</span>
                </div>
                <Badge className="bg-rose-100 text-rose-700">AI Attention Center: 3 Leads Need Action</Badge>
              </div>

              {/* Mock Attention Card */}
              <div className="rounded-2xl border border-rose-200 bg-linear-to-r from-rose-50/40 to-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-ink text-base">Rahul Sharma — Acme Corp</h4>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">Risk 78/100</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">⚠ No activity for 9 days · Proposal pending decision for 18 days</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">Generate AI Email</Button>
                  <Button size="sm">Schedule Task</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Us Section ────────────────────────────────────────── */}
      <section id="about" className="py-12 sm:py-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2 items-center">
            <div>
              <Badge className="bg-brand-50 text-brand-700 font-semibold mb-3">About RevFlux</Badge>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-ink leading-tight">
                We are building the smartest revenue platform for modern sales teams.
              </h2>
              <p className="mt-4 text-ink-soft text-sm sm:text-base leading-relaxed">
                Traditional CRMs are clunky, slow, and full of manual data entry that repels salespeople. At RevFlux, our mission is to redefine sales operations with AI-native intelligence, automated lead scoring, and instant pipeline visibility.
              </p>
              <p className="mt-3 text-ink-soft text-sm sm:text-base leading-relaxed">
                Whether you're a startup founder closing your first 50 clients or a growing sales team managing hundreds of active pipeline deals, RevFlux gives you full clarity on which deals need attention and what action to take next.
              </p>

              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 border-t border-line pt-6 text-center sm:text-left">
                <div className="rounded-2xl border sm:border-0 border-line/60 bg-surface-muted/30 p-3 sm:p-0">
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-brand-600">35%</p>
                  <p className="text-xs text-ink-soft font-medium mt-0.5 sm:mt-1">Faster Close Rates</p>
                </div>
                <div className="rounded-2xl border sm:border-0 border-line/60 bg-surface-muted/30 p-3 sm:p-0">
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-brand-600">10x</p>
                  <p className="text-xs text-ink-soft font-medium mt-0.5 sm:mt-1">Faster AI Email Drafts</p>
                </div>
                <div className="rounded-2xl border sm:border-0 border-line/60 bg-surface-muted/30 p-3 sm:p-0">
                  <p className="font-display text-2xl sm:text-3xl font-extrabold text-brand-600">99.9%</p>
                  <p className="text-xs text-ink-soft font-medium mt-0.5 sm:mt-1">System Uptime</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-surface-muted/60 p-5 sm:p-8 space-y-5 sm:space-y-6">
              <h3 className="font-display text-lg sm:text-xl font-bold text-ink">What We Stand For</h3>
              <div className="flex gap-4 items-start">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold text-sm sm:text-base">1</div>
                <div>
                  <h4 className="font-bold text-ink text-sm sm:text-base">No Deal Left Behind</h4>
                  <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">Our AI risk engine alerts you before leads go cold, calculating exact inactivity metrics.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold text-sm sm:text-base">2</div>
                <div>
                  <h4 className="font-bold text-ink text-sm sm:text-base">Visual & Frictionless Workflow</h4>
                  <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">Drag-and-drop Kanban board combined with custom stage values and instant status updates.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold text-sm sm:text-base">3</div>
                <div>
                  <h4 className="font-bold text-ink text-sm sm:text-base">1-Click Onboarding</h4>
                  <p className="text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">Get up and running in under 2 minutes with CSV import, demo workspaces, and guided setup.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────── */}
      <section id="features" className="py-12 sm:py-20 bg-surface border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-brand-50 text-brand-700 font-semibold mb-3">Core Features</Badge>
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-ink">
              Everything your sales team needs to close deals faster.
            </h2>
          </div>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Sparkles}
              title="AI Attention Center"
              description="Hybrid risk scoring evaluates deal age and inactivity to surface leads slipping away with explainable reasons."
            />
            <FeatureCard
              icon={KanbanSquare}
              title="Kanban Pipeline"
              description="Visual drag-and-drop deal board. Track deal values across New, Qualified, Proposal, Won, and Lost stages."
            />
            <FeatureCard
              icon={CalendarCheck}
              title="Follow-up Calendar"
              description="Timeline-grouped task checklist ensures no call or email follow-up falls through the cracks."
            />
            <FeatureCard
              icon={Mail}
              title="AI Email Generator"
              description="Draft hyper-personalized outreach emails injected with real lead details, then send via Resend in 1 click."
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-sky-50 text-sky-700 font-semibold mb-3">Simple Workflow</Badge>
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-ink">
              How RevFlux drives sales velocity.
            </h2>
          </div>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              title="Capture & Ingest Leads"
              description="Import your CSV list with field mapping or share your public capture form link with prospects."
            />
            <StepCard
              number="2"
              title="AI Scans & Scores Risk"
              description="The AI co-pilot continuously monitors your pipeline, highlighting stagnant deals and next best actions."
            />
            <StepCard
              number="3"
              title="Take Action & Close"
              description="Generate AI emails, schedule tasks, send outreach, and watch your conversion rate increase."
            />
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────── */}
      <section id="faq" className="py-12 sm:py-20 bg-surface border-t border-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <Badge className="bg-amber-50 text-amber-700 font-semibold mb-3">Got Questions?</Badge>
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-ink">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-8 sm:mt-12 space-y-3.5 sm:space-y-4">
            <FaqItem
              question="What is RevFlux?"
              answer="RevFlux is an AI-powered CRM designed specifically for small sales teams to track leads, schedule follow-ups, and get AI guidance on what action to take next."
              isOpen={openFaq === 0}
              onToggle={() => toggleFaq(0)}
            />
            <FaqItem
              question="How does AI Risk Scoring work?"
              answer="RevFlux combines deterministic business rules (days inactive, stage age, missing follow-ups) with LLM recommendations to calculate a 0-100 risk score with clear reasons."
              isOpen={openFaq === 1}
              onToggle={() => toggleFaq(1)}
            />
            <FaqItem
              question="Can I import my existing leads from Excel or CSV?"
              answer="Yes! RevFlux features a multi-step CSV importer with field mapping, data validation, and duplicate detection so you don't lose data."
              isOpen={openFaq === 2}
              onToggle={() => toggleFaq(2)}
            />
            <FaqItem
              question="Do I need my own OpenRouter / OpenAI API key?"
              answer="No! RevFlux comes pre-configured for free trial users. Advanced users can plug in their own keys in Settings."
              isOpen={openFaq === 3}
              onToggle={() => toggleFaq(3)}
            />
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action ───────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-brand-600 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl sm:text-5xl font-extrabold tracking-tight">
            Ready to stop losing sales leads?
          </h2>
          <p className="mt-3 sm:mt-4 text-brand-100 text-sm sm:text-base max-w-xl mx-auto">
            Join hundreds of sales reps using RevFlux to automate follow-ups and close deals faster.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50 font-bold px-6 sm:px-8 shadow-md" onClick={() => navigate("/register")}>
              Start Free 14-Day Trial
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/80 bg-white/10 text-white hover:bg-white/20 hover:text-white px-6 sm:px-8 font-semibold shadow-xs"
              onClick={() => navigate("/demo")}
            >
              <Play className="h-4 w-4 fill-current mr-1 text-white" /> Explore Demo Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface pt-12 sm:pt-16 pb-8 text-xs text-ink-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 pb-10 border-b border-line">
            {/* Brand Column */}
            <div className="space-y-4 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-display text-lg font-bold text-ink">RevFlux</span>
              </Link>
              <p className="text-xs text-ink-soft leading-relaxed max-w-sm">
                AI-powered revenue intelligence platform designed specifically for small sales teams to track leads, automate follow-ups, and close deals faster.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-ink-soft">All Systems Operational</span>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <p className="font-bold text-ink uppercase tracking-wider text-[11px]">Product</p>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-ink transition">AI Attention Center</a></li>
                <li><a href="#features" className="hover:text-ink transition">Kanban Pipeline</a></li>
                <li><a href="#how-it-works" className="hover:text-ink transition">CSV Importer</a></li>
                <li><Link to="/pricing" className="hover:text-ink transition">Pricing Plans</Link></li>
                <li><Link to="/demo" className="hover:text-ink transition">Interactive Demo</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="space-y-3">
              <p className="font-bold text-ink uppercase tracking-wider text-[11px]">Company</p>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-ink transition">About Us</a></li>
                <li><a href="#how-it-works" className="hover:text-ink transition">How It Works</a></li>
                <li><a href="#faq" className="hover:text-ink transition">FAQ</a></li>
                <li><Link to="/login" className="hover:text-ink transition">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-ink transition">Create Account</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-3">
              <p className="font-bold text-ink uppercase tracking-wider text-[11px]">Legal & Trust</p>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="hover:text-ink transition">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-ink transition">Terms of Service</Link></li>
                <li><Link to="/security" className="hover:text-ink transition">Security Architecture</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p>© 2026 RevFlux Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <Link to="/terms" className="hover:underline">Terms</Link>
              <Link to="/security" className="hover:underline">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card className="p-5 sm:p-6 transition hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base sm:text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft leading-relaxed">{description}</p>
    </Card>
  );
}

function StepCard({ number, title, description }) {
  return (
    <Card className="p-5 sm:p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
        {number}
      </div>
      <h3 className="font-display text-base sm:text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-xs sm:text-sm text-ink-soft leading-relaxed">{description}</p>
    </Card>
  );
}

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left font-display text-sm sm:text-base font-bold text-ink hover:bg-surface-muted/40 transition"
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-brand-600 shrink-0 ml-2" /> : <ChevronDown className="h-5 w-5 text-ink-soft shrink-0 ml-2" />}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-ink-soft leading-relaxed border-t border-line/40">
          {answer}
        </div>
      )}
    </div>
  );
}

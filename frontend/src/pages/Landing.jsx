import { useState } from "react";
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-ink">RevFlux</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
            <a href="#features" className="hover:text-ink transition">Features</a>
            <a href="#how-it-works" className="hover:text-ink transition">How It Works</a>
            <Link to="/pricing" className="hover:text-ink transition">Pricing</Link>
            <a href="#faq" className="hover:text-ink transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/")}>
                Go to Workspace <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate("/demo")}>
                  <Play className="h-3.5 w-3.5 fill-current" /> View Demo
                </Button>
                <Button onClick={() => navigate("/register")}>
                  Start Free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24">
        {/* Background Ambient Glow */}
        <div className="absolute left-1/2 top-10 -z-10 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="mx-auto max-w-5xl px-6 text-center">
          <Badge className="bg-brand-50 text-brand-700 mb-6 font-semibold px-3 py-1 text-xs">
            ✨ AI-Powered Revenue Intelligence Platform
          </Badge>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl leading-tight">
            Stop Losing Sales Leads.
          </h1>

          <p className="mt-6 text-lg text-ink-soft max-w-3xl mx-auto leading-relaxed">
            RevFlux helps small sales teams organize leads, automate follow-ups, and use AI to decide what to do next.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto px-8 py-3.5 text-base" onClick={() => navigate("/register")}>
              Start Free Trial <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-3.5 text-base" onClick={() => navigate("/demo")}>
              <Play className="h-4 w-4 fill-current mr-1 text-brand-600" /> View Demo Workspace
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-ink-soft">
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

      {/* ── Features Section ────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-surface border-y border-line">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-brand-50 text-brand-700 font-semibold mb-3">Core Features</Badge>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Everything your sales team needs to close deals faster.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
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
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-sky-50 text-sky-700 font-semibold mb-3">Simple Workflow</Badge>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              How RevFlux drives sales velocity.
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
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
      <section id="faq" className="py-20 bg-surface border-t border-line">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <Badge className="bg-amber-50 text-amber-700 font-semibold mb-3">Got Questions?</Badge>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-12 space-y-4">
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
      <section className="py-20 bg-brand-600 text-white text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-3xl font-extrabold sm:text-5xl tracking-tight">
            Ready to stop losing sales leads?
          </h2>
          <p className="mt-4 text-brand-100 text-base max-w-xl mx-auto">
            Join hundreds of sales reps using RevFlux to automate follow-ups and close deals faster.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50 font-bold px-8" onClick={() => navigate("/register")}>
              Start Free 14-Day Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8" onClick={() => navigate("/demo")}>
              Explore Demo Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-8 text-center text-xs text-ink-soft">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="brand-gradient flex h-6 w-6 items-center justify-center rounded-lg text-white text-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-ink">RevFlux CRM</span>
            <span>© 2026 RevFlux Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:underline">Pricing</Link>
            <Link to="/demo" className="hover:underline">Demo</Link>
            <Link to="/login" className="hover:underline">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-xs text-ink-soft leading-relaxed">{description}</p>
    </Card>
  );
}

function StepCard({ number, title, description }) {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm mb-4">
        {number}
      </div>
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-xs text-ink-soft leading-relaxed">{description}</p>
    </Card>
  );
}

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left font-display text-base font-bold text-ink hover:bg-surface-muted/40 transition"
      >
        <span>{question}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-brand-600" /> : <ChevronDown className="h-5 w-5 text-ink-soft" />}
      </button>
      {isOpen && (
        <div className="p-5 pt-0 text-xs text-ink-soft leading-relaxed border-t border-line/40">
          {answer}
        </div>
      )}
    </div>
  );
}

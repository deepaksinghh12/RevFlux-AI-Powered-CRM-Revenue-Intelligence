import { Shield, FileText, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";

function PageHeader({ title, icon: Icon, description }) {
  return (
    <div className="mb-8 flex flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-ink-soft">{description}</p>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-6">
      <PageHeader title="Privacy Policy" icon={Shield} description="How we handle and protect your data." />
      <div className="prose prose-brand max-w-none text-ink">
        <h3 className="text-xl font-bold mt-8 mb-4">1. Data Collection</h3>
        <p className="mb-4 text-ink-soft">We collect only the data necessary to provide you with the best CRM experience. This includes account information, imported contacts, and integrations.</p>
        
        <h3 className="text-xl font-bold mt-8 mb-4">2. AI Processing</h3>
        <p className="mb-4 text-ink-soft">RevFlux uses LLMs to process lead data and generate insights. Your proprietary data is never used to train public foundational models.</p>
        
        <h3 className="text-xl font-bold mt-8 mb-4">3. DPDP Act Compliance</h3>
        <p className="mb-4 text-ink-soft">For our Indian users, RevFlux fully complies with the Digital Personal Data Protection Act. You have full rights to request deletion or export of your customer data at any time.</p>
        
        <div className="mt-12 text-center">
          <Link to="/" className="text-brand-600 font-medium hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-6">
      <PageHeader title="Terms of Service" icon={FileText} description="The rules of engagement." />
      <div className="prose prose-brand max-w-none text-ink">
        <h3 className="text-xl font-bold mt-8 mb-4">1. Acceptance of Terms</h3>
        <p className="mb-4 text-ink-soft">By using RevFlux, you agree to these terms. If you do not agree, please do not use the service.</p>
        
        <h3 className="text-xl font-bold mt-8 mb-4">2. Acceptable Use</h3>
        <p className="mb-4 text-ink-soft">You agree not to use RevFlux to send spam, phish for credentials, or violate any regional laws (including TRAI regulations for automated WhatsApp/SMS).</p>
        
        <div className="mt-12 text-center">
          <Link to="/" className="text-brand-600 font-medium hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export function HelpCenter() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-6">
      <PageHeader title="Help Center" icon={LifeBuoy} description="Get the support you need to close more deals." />
      
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500">
          <h4 className="font-bold text-ink mb-2">Getting Started Guide</h4>
          <p className="text-sm text-ink-soft mb-4">Learn how to import leads, set up your pipeline, and invite your team.</p>
          <button className="text-sm font-semibold text-brand-600">Read Article →</button>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500">
          <h4 className="font-bold text-ink mb-2">AI Copilot FAQ</h4>
          <p className="text-sm text-ink-soft mb-4">Understand how the AI risk score works and how to automate outreach.</p>
          <button className="text-sm font-semibold text-brand-600">Read Article →</button>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500">
          <h4 className="font-bold text-ink mb-2">Billing & Upgrades</h4>
          <p className="text-sm text-ink-soft mb-4">Manage your Razorpay subscription and view invoices.</p>
          <button className="text-sm font-semibold text-brand-600">Read Article →</button>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm transition hover:border-brand-500">
          <h4 className="font-bold text-ink mb-2">Contact Support</h4>
          <p className="text-sm text-ink-soft mb-4">Can't find what you need? Reach out to our 24/7 human support team.</p>
          <button className="text-sm font-semibold text-brand-600">Email Us →</button>
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <Link to="/" className="text-brand-600 font-medium hover:underline">Return to Dashboard</Link>
      </div>
    </div>
  );
}

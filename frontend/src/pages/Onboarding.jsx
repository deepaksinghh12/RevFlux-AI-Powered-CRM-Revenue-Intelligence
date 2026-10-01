import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Building2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  CheckCircle2,
  Check,
} from "lucide-react";
import { Card, Button, Input, Field, Select, Spinner } from "../components/ui";
import { authApi } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState(1); // 1: Profile, 2: Data Choice, 3: Success
  const [loading, setLoading] = useState(false);

  // Step 1 Form Data
  const [company, setCompany] = useState(user?.company || "");
  const [industry, setIndustry] = useState("Technology / SaaS");
  const [teamSize, setTeamSize] = useState("1-5 people");

  // Step 2 Data Selection
  const [dataChoice, setDataChoice] = useState("sample"); // "sample" | "csv" | "empty"

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!company.trim()) return toast.error("Please enter your company name.");

    setLoading(true);
    try {
      await authApi.updateProfile({ company: company.trim() });
      updateUser({ company: company.trim() });
      setStep(2);
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    setLoading(true);
    try {
      if (dataChoice === "sample") {
        await authApi.seedDemo();
        toast.success("Sample workspace seeded with deals!");
      }
      setStep(3);
    } catch (err) {
      toast.error(err?.message || "Failed to seed sample data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
            Welcome to RevFlux
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Let's set up your AI-powered sales workspace in less than 2 minutes.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          <StepPill number={1} label="Workspace Setup" active={step === 1} done={step > 1} />
          <StepPill number={2} label="Data Strategy" active={step === 2} done={step > 2} />
          <StepPill number={3} label="Ready" active={step === 3} done={step > 3} />
        </div>

        {/* STEP 1: COMPANY PROFILE */}
        {step === 1 && (
          <Card className="p-8 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Company Information</h2>
            <p className="text-xs text-ink-soft mb-6">Customize how your company appears in AI email drafts and reports.</p>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <Field label="Company / Organization Name">
                <Input
                  required
                  placeholder="e.g. RevFlux Software"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Field>

              <Field label="Industry">
                <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="Technology / SaaS">Technology / SaaS</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Agency / Consulting">Agency / Consulting</option>
                  <option value="E-Commerce / Retail">E-Commerce / Retail</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>

              <Field label="Sales Team Size">
                <Select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                  <option value="Solo (Just me)">Solo (Just me)</option>
                  <option value="1-5 people">1-5 people</option>
                  <option value="6-20 people">6-20 people</option>
                  <option value="20+ people">20+ people</option>
                </Select>
              </Field>

              <div className="pt-4">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Spinner size="sm" /> : "Continue to Next Step"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* STEP 2: DATA STRATEGY */}
        {step === 2 && (
          <Card className="p-8 shadow-[var(--shadow-card)] space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-ink mb-1">Populate Your Pipeline</h2>
              <p className="text-xs text-ink-soft">Choose how you'd like to initialize your sales pipeline.</p>
            </div>

            <div className="space-y-3">
              {/* Choice A: Sample Data */}
              <div
                onClick={() => setDataChoice("sample")}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                  dataChoice === "sample"
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20"
                    : "border-line bg-surface hover:border-brand-300"
                }`}
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold text-ink">Load Sample Demo Data (Recommended)</p>
                    {dataChoice === "sample" && <Check className="h-5 w-5 text-brand-600" />}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Populate your pipeline with 8 realistic sample deals, tasks, and AI risk scores to explore immediately.
                  </p>
                </div>
              </div>

              {/* Choice B: CSV Import */}
              <div
                onClick={() => setDataChoice("csv")}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                  dataChoice === "csv"
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20"
                    : "border-line bg-surface hover:border-brand-300"
                }`}
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold text-ink">Import Existing Leads (CSV)</p>
                    {dataChoice === "csv" && <Check className="h-5 w-5 text-brand-600" />}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Upload a CSV file from Excel, HubSpot, or Salesforce with column mapping.
                  </p>
                </div>
              </div>

              {/* Choice C: Empty */}
              <div
                onClick={() => setDataChoice("empty")}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                  dataChoice === "empty"
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20"
                    : "border-line bg-surface hover:border-brand-300"
                }`}
              >
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-bold text-ink">Start Clean (Blank Workspace)</p>
                    {dataChoice === "empty" && <Check className="h-5 w-5 text-brand-600" />}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    Start with a 100% empty pipeline and add your leads manually.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-line">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleStep2Submit} disabled={loading}>
                {loading && <Spinner size="sm" />}
                Initialize Workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: READY */}
        {step === 3 && (
          <Card className="p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Your RevFlux Workspace is Ready!</h2>
              <p className="mt-2 text-xs text-ink-soft">
                Your company profile <span className="font-semibold text-ink">{company}</span> has been configured.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Button size="lg" className="w-full" onClick={() => {
                localStorage.setItem("revflux_run_tour", "true");
                navigate(dataChoice === "csv" ? "/leads" : "/");
              }}>
                Go to Dashboard Workspace
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepPill({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
          done
            ? "bg-brand-600 text-white"
            : active
            ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500/30"
            : "bg-surface-muted text-ink-soft"
        }`}
      >
        {done ? "✓" : number}
      </div>
      <span className={`text-xs font-medium ${active ? "text-ink font-bold" : "text-ink-soft"}`}>
        {label}
      </span>
    </div>
  );
}

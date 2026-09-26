import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  User,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  Mail,
  KeyRound,
  CreditCard,
  Users,
  Phone,
  Briefcase,
  Building,
  FileText,
  ShieldCheck,
  History,
  Download,
  Activity,
  UserCheck,
  Settings as SettingsIcon,
} from "lucide-react";

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Field,
  Badge,
  Avatar,
  Spinner,
} from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { authApi, aiApi, leadsApi } from "../lib/services";
import { shortDate } from "../lib/format";
import { cn } from "../lib/utils";
import { SubscriptionModal } from "../components/billing/SubscriptionModal";

/* ── Icon Accent Helper ───────────────────────────────────────── */
function SectionIcon({ icon: Icon, className }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-200/40",
        className
      )}
    >
      <Icon className="h-4 w-4 text-brand-700" />
    </div>
  );
}

/* ── 1. Rich Profile Card ─────────────────────────────────────── */
function ProfileCard({ user, updateUser }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    if (!user) return;
    reset({
      name: user.name || "",
      company: user.company || "",
      avatar: user.avatar || "",
      phone: user.phone || "",
      jobTitle: user.jobTitle || "Sales Leader",
      department: user.department || "Revenue Operations",
      signature: user.signature || "",
    });
  }, [user, reset]);

  const onSubmit = async (form) => {
    try {
      const res = await authApi.updateProfile(form);
      updateUser(res.user);
      toast.success("Profile details updated successfully");
    } catch (err) {
      toast.error(err.message || "Could not update profile");
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={User} />
          <div>
            <CardTitle>Work Profile & Identity</CardTitle>
            <CardDescription>Manage your personal profile, job title, and team signature.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Rich Avatar Preview Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface-muted/60 p-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} src={user?.avatar} size="lg" className="ring-2 ring-brand-500/20" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-ink">{user?.name}</p>
                <Badge className="bg-brand-50 text-brand-700 font-bold uppercase text-[10px]">
                  {user?.role || "Owner"}
                </Badge>
              </div>
              <p className="text-xs text-ink-soft">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-soft">
                <span className="font-semibold text-ink">{user?.jobTitle || "Sales Leader"}</span>
                <span>•</span>
                <span>{user?.department || "Revenue Operations"}</span>
              </div>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Account Verified
          </Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" error={errors.name?.message}>
              <Input placeholder="Your full name" {...register("name", { required: "Name is required" })} />
            </Field>

            <Field label="Email Address">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input value={user?.email || ""} disabled className="pl-9 bg-surface-muted/40 cursor-not-allowed" readOnly />
              </div>
            </Field>

            <Field label="Company Name">
              <Input placeholder="Acme Revenue Corp" {...register("company")} />
            </Field>

            <Field label="Phone Number">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input placeholder="+91 98765 43210" className="pl-9" {...register("phone")} />
              </div>
            </Field>

            <Field label="Job Title">
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input placeholder="VP of Sales / Account Executive" className="pl-9" {...register("jobTitle")} />
              </div>
            </Field>

            <Field label="Department">
              <div className="relative">
                <Building className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input placeholder="Revenue Operations / Growth" className="pl-9" {...register("department")} />
              </div>
            </Field>

            <Field label="Avatar URL" className="sm:col-span-2">
              <Input placeholder="https://example.com/avatar.jpg" {...register("avatar")} />
            </Field>

            <Field label="Email Outreach Signature" className="sm:col-span-2">
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-ink-soft/50" />
                <textarea
                  rows={2}
                  className="w-full rounded-2xl border border-line bg-surface p-3 pl-9 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Best regards, Deepak Singh | RevFlux Sales Team"
                  {...register("signature")}
                />
              </div>
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── 2. Billing & Subscription Card ────────────────────────────── */
function BillingCard({ user }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    leadsApi
      .list({ limit: 1 })
      .then((res) => {
        if (res?.pagination?.total !== undefined) {
          setLeadCount(res.pagination.total);
        } else if (Array.isArray(res?.data)) {
          setLeadCount(res.data.length);
        }
      })
      .catch(() => {});
  }, []);

  const plan = user?.plan || "free";
  const limit = user?.leadLimit || (plan === "free" ? 50 : plan === "growth" ? 500 : 10000);
  const usagePct = Math.min(100, Math.round((leadCount / limit) * 100));

  return (
    <>
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={CreditCard} />
            <div>
              <CardTitle>Subscription & Razorpay Gateway</CardTitle>
              <CardDescription>Manage active plan tier, lead limits, and verified billing receipts.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface-muted/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display text-base font-bold text-ink capitalize">
                  {plan} Tier Workspace
                </h4>
                <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase text-[10px]">
                  {user?.subscriptionStatus || "Active"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {plan === "free"
                  ? "Basic pipeline tracking up to 50 active leads."
                  : plan === "growth"
                  ? "Growth tier with up to 500 active leads, Razorpay verification, and AI engine."
                  : "Unlimited leads, dedicated priority AI throughput, and custom SLAs."}
              </p>
            </div>
            <Button variant="primary" onClick={() => setModalOpen(true)} className="shrink-0">
              Upgrade Plan
            </Button>
          </div>

          {/* Usage Capacity Bar */}
          <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-ink">Lead Quota Consumption</span>
              <span className="text-ink-soft">
                {leadCount} / {limit >= 10000 ? "Unlimited" : limit} Leads ({usagePct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden border border-line/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePct >= 90
                    ? "bg-red-500"
                    : usagePct >= 75
                    ? "bg-amber-500"
                    : "bg-brand-600"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {user?.lastPaymentId && (
              <div className="pt-2 flex items-center justify-between text-[11px] text-ink-soft border-t border-line/50 mt-2">
                <span>Last Razorpay Payment ID: <code className="font-mono text-ink font-semibold">{user.lastPaymentId}</code></span>
                <span className="text-emerald-700 font-medium">Verified SSL Transaction</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SubscriptionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/* ── 3. Workspace & Data Management Card ───────────────────────── */
function WorkspaceCard() {
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await authApi.seedDemo();
      toast.success("Sample workspace data seeded successfully!");
      window.location.reload();
    } catch (err) {
      toast.error(err?.message || "Failed to seed sample data");
    } finally {
      setSeeding(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await leadsApi.list({ limit: 1000 });
      const data = res?.data || [];
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `revflux_leads_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(`Exported ${data.length} workspace leads to JSON`);
    } catch (err) {
      toast.error("Failed to export workspace backup");
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Sparkles} />
          <div>
            <CardTitle>Workspace & Data Reset</CardTitle>
            <CardDescription>Re-run onboarding wizard, seed sandbox deals, or export full backups.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted/50 p-3.5">
          <div>
            <p className="text-xs font-bold text-ink">Guided Onboarding Wizard</p>
            <p className="text-[11px] text-ink-soft">Re-run the 3-step setup wizard to configure your company profile.</p>
          </div>
          <Button variant="outline" size="xs" onClick={() => (window.location.href = "/onboarding")}>
            Run Onboarding
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted/50 p-3.5">
          <div>
            <p className="text-xs font-bold text-ink">Seed Sample Pipeline</p>
            <p className="text-[11px] text-ink-soft">Populate workspace with 8 deals, tasks, and notes in 1 click.</p>
          </div>
          <Button variant="secondary" size="xs" onClick={handleSeedDemo} disabled={seeding}>
            {seeding && <Spinner size="sm" />}
            Seed Demo Data
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-surface-muted/50 p-3.5">
          <div>
            <p className="text-xs font-bold text-ink">Export Workspace Backup</p>
            <p className="text-[11px] text-ink-soft">Download complete lead pipeline dataset as structured JSON backup.</p>
          </div>
          <Button variant="ghost" size="xs" className="text-brand-600 font-semibold" onClick={handleExportData}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 4. Security & Password Card ───────────────────────────────── */
function SecurityCard() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const newPassword = watch("password");

  const onSubmit = async ({ password }) => {
    try {
      await authApi.updateProfile({ password });
      toast.success("Password updated successfully");
      reset();
    } catch (err) {
      toast.error(err.message || "Could not update password");
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Lock} />
          <div>
            <CardTitle>Security & Credentials</CardTitle>
            <CardDescription>Update account password and active session protection.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New Password" error={errors.password?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  className="pl-9"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Must be at least 6 characters",
                    },
                  })}
                />
              </div>
            </Field>

            <Field label="Confirm Password" error={errors.confirmPassword?.message}>
              <Input
                type="password"
                placeholder="Re-enter password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (v) => v === newPassword || "Passwords do not match",
                })}
              />
            </Field>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={isSubmitting}>
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── 5. RBAC & Multi-Role Permissions Management Panel ────────── */
function RbacPermissionsCard({ user, updateUser }) {
  const currentRole = user?.role || "owner";
  const [updating, setUpdating] = useState(false);

  const rolesConfig = [
    {
      id: "owner",
      title: "Owner / Super Admin",
      desc: "Full unrestricted access to pipeline, billing, RBAC controls, and data deletion.",
      permissions: ["Manage Billing & Razorpay", "Assign Team Roles", "Lead Deletion & Bulk Export", "Full AI Capabilities"],
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      id: "admin",
      title: "Workspace Administrator",
      desc: "Manages CRM settings, team members, integrations, and lead assignments.",
      permissions: ["Manage Team Members", "Full AI Capabilities", "Lead Creation & Editing", "Analytics & Reporting"],
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "manager",
      title: "Sales Manager",
      desc: "Oversees deals, lead scoring, rep task schedules, and pipeline stages.",
      permissions: ["Pipeline & Kanban Control", "AI Draft Generation", "Task Assignment", "View Team Analytics"],
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      id: "rep",
      title: "Sales Representative",
      desc: "Manages assigned leads, executes follow-up tasks, and logs customer notes.",
      permissions: ["Own Lead Management", "Log Notes & Tasks", "AI Email Drafting", "Read-Only Dashboard"],
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  const handleRoleSelect = async (roleId) => {
    if (roleId === currentRole) return;
    setUpdating(true);
    try {
      const res = await authApi.updateProfile({ role: roleId });
      updateUser(res.user);
      toast.success(`Active workspace role switched to ${roleId.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to switch role");
    } finally {
      setUpdating(false);
    }
  };

  const activeRoleObj = rolesConfig.find((r) => r.id === currentRole) || rolesConfig[0];

  return (
    <Card className="shadow-xs border-brand-200/50 bg-gradient-to-br from-surface to-brand-50/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Users} className="bg-brand-100 text-brand-800" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>RBAC & Team Role Engine</CardTitle>
              <Badge className="bg-brand-600 text-white text-[9px] uppercase font-bold">Multi-Role Enabled</Badge>
            </div>
            <CardDescription>Role-Based Access Control and team permission matrix.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-4">
        {/* Active Role Card */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft font-medium">Your Workspace Access Level:</span>
            <Badge className={cn("capitalize font-bold text-xs px-2.5 py-0.5 border", activeRoleObj.color)}>
              <UserCheck className="h-3.5 w-3.5 mr-1" /> {activeRoleObj.title}
            </Badge>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">{activeRoleObj.desc}</p>
        </div>

        {/* Interactive Role Switcher */}
        <div>
          <label className="text-[11px] font-bold text-ink uppercase tracking-wider block mb-2">
            Switch RBAC Role Mode (Preview)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {rolesConfig.map((r) => {
              const isActive = r.id === currentRole;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  disabled={updating}
                  className={`p-2.5 rounded-xl border text-left transition text-xs flex flex-col justify-between ${
                    isActive
                      ? "border-brand-500 bg-brand-50/70 text-brand-800 font-bold ring-2 ring-brand-500/20 shadow-xs"
                      : "border-line bg-surface text-ink-soft hover:border-brand-300"
                  }`}
                >
                  <span className="capitalize text-ink font-bold">{r.id} Mode</span>
                  <span className="text-[10px] text-ink-soft/80 mt-0.5">{r.title.split("/")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions Capabilities List */}
        <div className="rounded-2xl border border-line/60 bg-surface/80 p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-ink uppercase tracking-wider">Granted Capability Matrix</p>
          <div className="space-y-1.5 text-xs">
            {activeRoleObj.permissions.map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-ink-soft">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 6. AI Integration Side Widget ─────────────────────────────── */
function AiStatusWidget() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    aiApi
      .status()
      .then((res) => setStatus(res))
      .catch(() => setStatus({ success: false, configured: false, model: null }));
  }, []);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Sparkles} />
          <div>
            <CardTitle>AI Engine & Model Hub</CardTitle>
            <CardDescription>Google Gemini integration status.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {status === null ? (
          <div className="flex items-center gap-3 py-2 text-xs text-ink-soft">
            <Spinner size="sm" /> Checking Gemini status…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/50 p-3">
              <div className="flex items-center gap-2">
                {status.configured ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px]">
                    Not Configured
                  </Badge>
                )}
              </div>
              <span className="font-mono text-[11px] font-semibold text-ink">
                {status.model || "gemini-2.5-flash"}
              </span>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              Powers automatic deal risk scoring, AI email drafting, and executive briefing summaries.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── 7. System Health & Security Audit Stream ─────────────────── */
function AuditStreamCard({ user, logout }) {
  const auditEvents = [
    { text: "Workspace role initialized", time: "Just now", icon: ShieldCheck },
    { text: "Razorpay payment checkout verified", time: "Today", icon: CreditCard },
    { text: "SSL 256-bit session token generated", time: "Active session", icon: Lock },
    { text: "Gemini AI model engine connected", time: "System online", icon: Sparkles },
  ];

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Activity} />
          <div>
            <CardTitle>Security & Audit Stream</CardTitle>
            <CardDescription>Recent account security & session events.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-4">
        <div className="space-y-2">
          {auditEvents.map((evt, idx) => {
            const Icon = evt.icon;
            return (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-line/50 bg-surface-muted/40 p-2.5 text-xs">
                <div className="flex items-center gap-2 text-ink">
                  <Icon className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                  <span>{evt.text}</span>
                </div>
                <span className="text-[10px] text-ink-soft">{evt.time}</span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between">
          <span className="text-xs text-ink-soft">
            Member since: <strong className="text-ink">{shortDate(user?.createdAt)}</strong>
          </span>
          <Button variant="danger" size="sm" onClick={logout}>
            Log Out Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Page Root Component ────────────────────────────────────────── */
export default function Settings() {
  const { user, updateUser, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Workspace Administration & Settings"
        subtitle="Configure profile identity, RBAC multi-role access controls, Razorpay subscription billing, and security settings."
      />

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-xs shadow-2xs">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          <SettingsIcon className="h-4 w-4 text-brand-600" /> Workspace Status:
        </div>
        <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase font-bold text-[10px]">
          Role: {user?.role || "Owner"}
        </Badge>
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase font-bold text-[10px]">
          Plan: {user?.plan || "Free"}
        </Badge>
        <Badge className="bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold text-[10px]">
          SSL Encrypted
        </Badge>
      </div>

      {/* 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileCard user={user} updateUser={updateUser} />
          <BillingCard user={user} />
          <WorkspaceCard />
          <SecurityCard />
        </div>

        {/* Right / Sidebar Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <RbacPermissionsCard user={user} updateUser={updateUser} />
          <AiStatusWidget />
          <AuditStreamCard user={user} logout={logout} />
        </div>
      </div>
    </div>
  );
}

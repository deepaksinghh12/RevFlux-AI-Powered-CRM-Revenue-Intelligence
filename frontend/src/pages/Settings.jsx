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
  Copy,
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
import { authApi, aiApi, leadsApi, orgApi } from "../lib/services";
import { shortDate } from "../lib/format";
import { cn } from "../lib/utils";
import { TOKEN_KEY } from "../lib/api";
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
function ProfileCard({ user, updateUser, activeOrg }) {
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
                  {activeOrg?.role || "Member"}
                </Badge>
              </div>
              <p className="text-xs text-ink-soft">{user?.email}</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-soft">
                <span className="font-semibold text-ink">{user?.jobTitle || "Sales Leader"}</span>
                <span>•</span>
                <span>{user?.department || "Revenue Operations"}</span>
              </div>
              {activeOrg?.memberId && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-soft">Member ID:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrg.memberId);
                      toast.success(`Copied ${activeOrg.memberId} to clipboard`);
                    }}
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                    title="Click to copy Member ID"
                  >
                    <span>{activeOrg.memberId}</span>
                    <Copy className="h-2.5 w-2.5 opacity-60" />
                  </button>
                </div>
              )}
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
function BillingCard({ user, activeOrg }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    leadsApi
      .list({ limit: 1 })
      .then((res) => {
        setLeadCount(res?.count ?? (Array.isArray(res?.leads) ? res.leads.length : 0));
      })
      .catch(() => {});
  }, [activeOrg?.id]);

  const plan = activeOrg?.plan || "free";
  const limit = activeOrg?.leadLimit || (plan === "free" ? 50 : plan === "growth" ? 500 : 10000);
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
                  {activeOrg?.subscriptionStatus || "Active"}
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
            {(activeOrg?.lastPaymentId || user?.lastPaymentId) && (
              <div className="pt-2 flex items-center justify-between text-[11px] text-ink-soft border-t border-line/50 mt-2">
                <span>Last Razorpay Payment ID: <code className="font-mono text-ink font-semibold">{activeOrg?.lastPaymentId || user?.lastPaymentId}</code></span>
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
            <p className="text-xs font-bold text-ink">Interactive Product Tour</p>
            <p className="text-[11px] text-ink-soft">Re-run the dashboard product tour guide.</p>
          </div>
          <Button variant="outline" size="xs" onClick={() => {
            localStorage.setItem("revflux_run_tour", "true");
            window.location.href = "/";
          }}>
            Run Tour
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
  const [revoking, setRevoking] = useState(false);
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
      const res = await authApi.updateProfile({ password });
      if (res?.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      toast.success(res?.message || "Password updated successfully");
      reset();
    } catch (err) {
      toast.error(err.message || "Could not update password");
    }
  };

  const handleRevokeSessions = async () => {
    if (!window.confirm("Are you sure you want to invalidate all other active sessions across all devices?")) {
      return;
    }
    setRevoking(true);
    try {
      const res = await authApi.revokeSessions();
      if (res?.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      toast.success(res?.message || "All previous sessions have been revoked.");
    } catch (err) {
      toast.error(err?.message || "Failed to revoke sessions");
    } finally {
      setRevoking(false);
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

      <CardContent className="pt-4 space-y-6">
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

        <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink">Active Session Revocation</p>
            <p className="text-[11px] text-ink-soft">
              Instantly invalidate all existing sessions and sign out of other devices.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={revoking}
            onClick={handleRevokeSessions}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            Revoke All Other Sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 5. RBAC & Multi-Role Permissions Management Panel ────────── */
function RbacPermissionsCard({ user, activeOrg }) {
  const currentRole = activeOrg?.role || "rep";

  const canonicalRolesConfig = [
    {
      id: "owner",
      title: "Workspace Owner",
      desc: "Full administrative and billing authority over the workspace, subscription tier, and member roles.",
      permissions: ["Manage Billing & Subscription", "Assign Team Roles", "Manage Workspaces", "Executive Analytics & Reports", "All Lead & CRM Operations"],
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      id: "admin",
      title: "Workspace Administrator",
      desc: "Full operational management over CRM records, outreach cadences, member invites, and data pipelines.",
      permissions: ["Invite Team Members", "Manage Outreach Sequences", "Import Bulk Data", "Manage Leads, Tasks, Contacts & Notes", "Analytics & Reports"],
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "manager",
      title: "Sales Manager",
      desc: "Oversees team sales performance, pipeline stages, lead risk scoring, task assignments, and target deal quotas.",
      permissions: ["Assign Leads & Tasks", "Full Pipeline Kanban Control", "AI Deal Risk Analytics", "Team Performance Reports"],
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      id: "rep",
      title: "Sales Representative",
      desc: "Manages assigned leads, creates contacts, logs notes, updates assigned tasks, and executes AI outreach.",
      permissions: ["Assigned Lead Management", "Log Notes & Follow-ups", "AI Email Outreach Drafting", "Manage Assigned Tasks & Contacts"],
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      id: "viewer",
      title: "Read-Only Viewer",
      desc: "View-only access across CRM records, pipeline metrics, and reports without modification privileges.",
      permissions: ["View CRM Leads", "View Contacts & Notes", "View Tasks", "View Analytics & Reports"],
      color: "bg-slate-50 text-slate-700 border-slate-200",
    },
  ];

  const activeRoleObj = canonicalRolesConfig.find((r) => r.id === currentRole) || canonicalRolesConfig[3];

  return (
    <Card className="shadow-xs border-brand-200/50 bg-gradient-to-br from-surface to-brand-50/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Users} className="bg-brand-100 text-brand-800" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>RBAC & Workspace Permissions</CardTitle>
              <Badge className="bg-brand-600 text-white text-[9px] uppercase font-bold">Role-Based Access Control</Badge>
            </div>
            <CardDescription>Active workspace role assignment and granted capability matrix.</CardDescription>
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
function AuditStreamCard({ user, logout, activeOrg }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canViewAuditLogs = ["owner", "admin"].includes(activeOrg?.role);

  useEffect(() => {
    if (!canViewAuditLogs) {
      setLoading(false);
      return;
    }

    setLoading(true);
    orgApi
      .getAuditLogs({ page, limit: 6 })
      .then((res) => {
        if (res && res.data) {
          setLogs(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages || 1);
          }
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load audit logs");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, canViewAuditLogs]);

  const formatActionName = (action) => {
    return (action || "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Activity} />
          <div>
            <CardTitle>Workspace Security & Audit Trail</CardTitle>
            <CardDescription>Live record mutations & administrative activity stream.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 space-y-4">
        {!canViewAuditLogs ? (
          <div className="rounded-xl border border-line/60 bg-surface-muted/40 p-4 text-xs text-ink-soft">
            <div className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Audit Log Restricted
            </div>
            <p className="mt-1">
              Live audit trails are restricted to Workspace Owners and Administrators.
            </p>
          </div>
        ) : loading && logs.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-xs text-ink-soft">
            <Spinner size="sm" /> Loading audit trail…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs text-rose-700">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-line/50 bg-surface-muted/30 p-4 text-center text-xs text-ink-soft">
            No audit events recorded yet for this workspace.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 rounded-xl border border-line/50 bg-surface-muted/40 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                    <span>{formatActionName(log.action)}</span>
                  </div>
                  <span className="text-[10px] text-ink-soft">{shortDate(log.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-soft">
                  <div className="flex items-center gap-1.5">
                    <span>
                      By: <strong className="text-ink">{log.user?.name || log.user?.email || "System"}</strong>
                    </span>
                    {log.user?.memberId && (
                      <span className="font-mono text-[9px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 rounded px-1 py-0.5">
                        {log.user.memberId}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-ink-soft/80">
                    {log.entityType}
                  </span>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-[11px] text-ink-soft">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

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
  const { user, activeOrg, updateUser, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Workspace Administration & Settings"
        subtitle="Configure profile identity, RBAC multi-role access controls, subscription billing, and security settings."
      />

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-xs shadow-2xs">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          <SettingsIcon className="h-4 w-4 text-brand-600" /> Workspace Status:
        </div>
        <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase font-bold text-[10px]">
          Role: {activeOrg?.role || "Member"}
        </Badge>
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase font-bold text-[10px]">
          Plan: {activeOrg?.plan || "Free"}
        </Badge>
        <Badge className="bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold text-[10px]">
          {activeOrg?.name || "Workspace"}
        </Badge>
      </div>

      {/* 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ProfileCard user={user} updateUser={updateUser} activeOrg={activeOrg} />
          <BillingCard user={user} activeOrg={activeOrg} />
          <WorkspaceCard />
          <SecurityCard />
        </div>

        {/* Right / Sidebar Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <RbacPermissionsCard user={user} updateUser={updateUser} activeOrg={activeOrg} />
          <AiStatusWidget />
          <AuditStreamCard user={user} logout={logout} activeOrg={activeOrg} />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Database,
  Trash2,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  SlidersHorizontal,
  Compass,
  Sliders,
  Layers,
  LogOut,
} from "lucide-react";

import { ConfirmDialog } from "../components/common/ConfirmDialog";

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

/* ── Category & Group Definitions ─────────────────────────────── */
const OVERVIEW_CATEGORY = {
  id: "overview",
  label: "Overview",
  icon: SlidersHorizontal,
  description: "Account summary, plan usage & quick shortcuts",
};

const PERSONAL_SETTINGS = [
  {
    id: "profile",
    label: "My Profile",
    icon: User,
    description: "Full name, email, avatar, job title & signature",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    description: "Password updates, session revocation & logout",
  },
];

const WORKSPACE_SETTINGS = [
  {
    id: "workspace",
    label: "General & Workspace",
    icon: Building,
    description: "Company identity, member IDs & workspace info",
  },
  {
    id: "team",
    label: "Team & Permissions",
    icon: Users,
    description: "RBAC roles, assignments & capability matrix",
  },
  {
    id: "billing",
    label: "Billing & Plan",
    icon: CreditCard,
    description: "Subscription tier, lead quotas & Razorpay receipts",
  },
  {
    id: "integrations",
    label: "Integrations & AI",
    icon: Sparkles,
    description: "Gemini AI model engine & authentication providers",
  },
  {
    id: "data",
    label: "Data & Recovery",
    icon: Database,
    description: "Trash recovery, JSON backup export & demo pipeline",
  },
  {
    id: "audit",
    label: "Activity & Audit",
    icon: Activity,
    description: "Live workspace mutation audit trail & event stream",
  },
];

const SETTINGS_CATEGORIES = [
  OVERVIEW_CATEGORY,
  ...PERSONAL_SETTINGS,
  ...WORKSPACE_SETTINGS,
];

/* ── 1. My Profile Card ───────────────────────────────────────── */
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
                  rows={3}
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

/* ── 2. Workspace Identity Card ───────────────────────────────── */
function WorkspaceIdentityCard({ user, activeOrg, switchOrganization }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <SectionIcon icon={Building} />
          <div>
            <CardTitle>Workspace Identity & Details</CardTitle>
            <CardDescription>Primary workspace configuration, identifiers, and organization overview.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line bg-surface-muted/40 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Workspace Name</span>
            <p className="font-display text-base font-bold text-ink">{activeOrg?.name || "RevFlux Workspace"}</p>
            <p className="text-xs text-ink-soft">Active multi-tenant organization</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-muted/40 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Your Assigned Member ID</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="font-mono text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200/60 rounded px-2 py-0.5">
                {activeOrg?.memberId || "MEMBER"}
              </span>
              {activeOrg?.memberId && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(activeOrg.memberId);
                    toast.success(`Copied ${activeOrg.memberId} to clipboard`);
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              )}
            </div>
            <p className="text-xs text-ink-soft">Used for direct attribution and chat mentions</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-muted/40 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Account Role</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase font-bold text-[10px]">
                {activeOrg?.role || "Member"}
              </Badge>
              <span className="text-xs text-ink-soft capitalize">Active access level</span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface-muted/40 p-4 space-y-1">
            <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Member Since</span>
            <p className="text-sm font-semibold text-ink">{shortDate(user?.createdAt)}</p>
            <p className="text-xs text-ink-soft">Workspace joining timestamp</p>
          </div>
        </div>

        {/* Workspace Switcher (available when user belongs to multiple organizations) */}
        {user?.workspaces && user.workspaces.length > 1 && (
          <div className="rounded-2xl border border-line bg-surface-muted/30 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-ink">Switch Active Workspace</p>
              <p className="text-[11px] text-ink-soft">Select another workspace associated with your account.</p>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {user.workspaces.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => switchOrganization(org.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition text-xs cursor-pointer",
                    activeOrg?.id === org.id
                      ? "bg-brand-50 border border-brand-200 text-brand-800 font-semibold shadow-2xs"
                      : "bg-surface hover:bg-surface-muted text-ink border border-line"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-brand-100 text-[10px] font-bold text-brand-700">
                      {org.name.charAt(0)}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </div>
                  {activeOrg?.id === org.id && <span className="text-[10px] font-medium text-brand-600">Active</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-line/60 bg-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-ink">Manage Workspace Team</p>
            <p className="text-[11px] text-ink-soft">Invite members, manage assigned roles, and view active collaborators.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/team")}>
            <Users className="h-4 w-4 mr-1.5 text-brand-600" /> Open Team Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 3. Billing & Subscription Card ────────────────────────────── */
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

/* ── 4. Data & Recovery Management Card ───────────────────────── */
function DataManagementCard() {
  const navigate = useNavigate();
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
          <SectionIcon icon={Database} />
          <div>
            <CardTitle>Data Management & Recovery</CardTitle>
            <CardDescription>Trash recovery, sandbox deal seeding, backups, and setup guides.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/20 p-3.5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-ink">Universal Trash & Data Recovery</p>
              <Badge className="bg-brand-100 text-brand-800 text-[9px] uppercase font-bold">30-Day Retention</Badge>
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">View and restore soft-deleted leads, contacts, tasks, and notes.</p>
          </div>
          <Button variant="outline" size="xs" onClick={() => navigate("/trash")} className="border-brand-300 text-brand-700 hover:bg-brand-50">
            <Trash2 className="h-3.5 w-3.5 mr-1 text-brand-600" /> Open Trash
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
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              localStorage.setItem("revflux_run_tour", "true");
              window.location.href = "/";
            }}
          >
            Run Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 5. Security & Password Card ───────────────────────────────── */
function SecurityCard({ onOpenLogout }) {
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
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
          >
            Revoke All Other Sessions
          </Button>
        </div>

        {/* Current Device Session Sign Out */}
        <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink">Account Session</p>
            <p className="text-[11px] text-ink-soft">
              Sign out of your active RevFlux session on this device.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenLogout}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Log Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 6. RBAC & Multi-Role Permissions Management Panel ────────── */
function RbacPermissionsCard({ user, activeOrg }) {
  const navigate = useNavigate();
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
        <div className="flex items-center justify-between">
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
          {["owner", "admin"].includes(currentRole) && (
            <Button size="xs" variant="outline" onClick={() => navigate("/team")}>
              <Users className="h-3.5 w-3.5 mr-1 text-brand-600" /> Manage Team
            </Button>
          )}
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

/* ── 7. Integrations & AI Engine Card ─────────────────────────── */
function IntegrationsCard({ user }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    aiApi
      .status()
      .then((res) => setStatus(res))
      .catch(() => setStatus({ success: false, configured: false, model: null }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Gemini AI Widget */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={Sparkles} />
            <div>
              <CardTitle>AI Engine & Model Hub</CardTitle>
              <CardDescription>Google Gemini integration status and AI features.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
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

      {/* Identity Providers */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={Shield} />
            <div>
              <CardTitle>Identity & Authentication Providers</CardTitle>
              <CardDescription>Connected sign-in methods and SSO federation.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-3">
          {/* Microsoft OIDC */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                MS
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Microsoft Entra ID (OIDC)</p>
                <p className="text-[11px] text-ink-soft">
                  {user?.microsoftId ? (
                    <span className="font-mono text-[10px] text-emerald-700">Linked: {user.microsoftId}</span>
                  ) : (
                    "Available for work, school, and personal accounts"
                  )}
                </p>
              </div>
            </div>
            {user?.microsoftId ? (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Linked
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 text-[10px]">
                Ready to Sign In
              </Badge>
            )}
          </div>

          {/* Google OAuth */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center font-bold text-red-600 text-xs">
                G
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Google Workspace OAuth</p>
                <p className="text-[11px] text-ink-soft">Direct Google sign-in and account authentication</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>

          {/* Email OTP */}
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-xs">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">Passwordless Email OTP</p>
                <p className="text-[11px] text-ink-soft">Secure one-time passcode verification via Resend</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── 8. System Health & Security Audit Stream ─────────────────── */
function AuditStreamCard({ user, onOpenLogout, activeOrg }) {
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
          <Button variant="danger" size="sm" onClick={onOpenLogout}>
            Log Out Session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── 9. Settings Overview Landing View ────────────────────────── */
function SettingsOverview({ user, activeOrg, onSelectTab, onOpenLogout }) {
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
    <div className="space-y-6">
      {/* Overview Identity Banner */}
      <Card className="p-5 shadow-xs border-brand-200/50 bg-gradient-to-br from-surface via-surface to-brand-50/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} src={user?.avatar} size="lg" className="ring-2 ring-brand-500/20 shrink-0" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-ink">{user?.name}</h3>
                <Badge className="bg-brand-50 text-brand-700 font-bold uppercase text-[10px]">
                  {activeOrg?.role || "Member"}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Account Verified
                </Badge>
              </div>
              <p className="text-xs text-ink-soft">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-soft pt-0.5">
                <span className="font-semibold text-ink">{activeOrg?.name || "Workspace"}</span>
                {activeOrg?.memberId && (
                  <>
                    <span>•</span>
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
                  </>
                )}
                <span>•</span>
                <span>Joined {shortDate(user?.createdAt)}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onSelectTab("profile")}
            className="shrink-0"
          >
            <User className="h-3.5 w-3.5 mr-1.5 text-brand-600" /> Edit Profile
          </Button>
        </div>
      </Card>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Subscription & Quota Card */}
        <div
          onClick={() => onSelectTab("billing")}
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2.5 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Subscription Plan</span>
            <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 capitalize font-bold text-[10px]">
              {plan}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-ink-soft">
              <span>Lead Quota</span>
              <span>{leadCount} / {limit >= 10000 ? "∞" : limit} ({usagePct}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 90 ? "bg-red-500" : usagePct >= 75 ? "bg-amber-500" : "bg-brand-600"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center text-[11px] font-semibold text-brand-600 group-hover:text-brand-700 pt-0.5">
            <span>Manage billing</span>
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </div>

        {/* Access & Role Card */}
        <div
          onClick={() => onSelectTab("team")}
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2.5 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Access Level</span>
            <Badge className="bg-purple-50 text-purple-700 border border-purple-200/60 capitalize font-bold text-[10px]">
              {activeOrg?.role || "Member"}
            </Badge>
          </div>
          <p className="text-xs text-ink-soft line-clamp-2">
            Multi-role RBAC capability matrix and assigned workspace permissions.
          </p>
          <div className="flex items-center text-[11px] font-semibold text-brand-600 group-hover:text-brand-700 pt-0.5">
            <span>View permissions</span>
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </div>

        {/* Security & Credentials Card */}
        <div
          onClick={() => onSelectTab("security")}
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2.5 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft">Account Security</span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Protected
            </span>
          </div>
          <p className="text-xs text-ink-soft line-clamp-2">
            Password updates, session revocation, and security tokens.
          </p>
          <div className="flex items-center text-[11px] font-semibold text-brand-600 group-hover:text-brand-700 pt-0.5">
            <span>Security settings</span>
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Grouped Quick Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Workspace Operations Quick Hub */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 border border-brand-200/50 text-brand-700">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-ink">Workspace Operations</h4>
              <p className="text-xs text-ink-soft">Organization administration, team access, and data recovery</p>
            </div>
          </div>

          <div className="divide-y divide-line/60">
            <button
              type="button"
              onClick={() => onSelectTab("workspace")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span>General Workspace Identity & Member IDs</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("team")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>Team Roles & RBAC Matrix</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("data")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Trash Recovery & Data Exports</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("integrations")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Gemini AI Engine & OIDC Providers</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("audit")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Audit Trail & Event Log</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Personal Account Quick Hub */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 border border-purple-200/50 text-purple-700">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-ink">Personal Account</h4>
              <p className="text-xs text-ink-soft">Your credentials, identity, and session security</p>
            </div>
          </div>

          <div className="divide-y divide-line/60">
            <button
              type="button"
              onClick={() => onSelectTab("profile")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span>Profile, Job Title & Signature</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("security")}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-ink hover:text-brand-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Password & Active Session Protection</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-ink-soft group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              type="button"
              onClick={onOpenLogout}
              className="w-full flex items-center justify-between py-2.5 text-left text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>End Active Session (Log Out)</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page Root Component ────────────────────────────────────────── */
export default function Settings() {
  const { user, activeOrg, updateUser, logout, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      logout();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      setIsLoggingOut(false);
      toast.error(err?.message || "Failed to log out");
    }
  };

  // Extract active tab from URL query params (default to "overview")
  const activeTab = searchParams.get("tab") || "overview";

  const handleSelectTab = (tabId) => {
    if (tabId === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  const currentCategory = useMemo(() => {
    return SETTINGS_CATEGORIES.find((c) => c.id === activeTab) || SETTINGS_CATEGORIES[0];
  }, [activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Workspace Administration & Settings"
        subtitle="Manage your profile, team permissions, subscription billing, security, and data recovery."
      />

      {/* Main Settings Layout: Sidebar Nav + Content Panel */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Desktop Persistent Category Navigation */}
        <aside className="hidden md:block w-64 shrink-0 rounded-2xl border border-line bg-surface p-2 shadow-xs">
          {/* Overview Button */}
          <div className="mb-2">
            <button
              type="button"
              onClick={() => handleSelectTab("overview")}
              className={cn(
                "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                activeTab === "overview"
                  ? "bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-2xs"
                  : "text-ink-soft hover:bg-surface-muted hover:text-ink"
              )}
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className={cn("h-4 w-4", activeTab === "overview" ? "text-brand-700" : "text-ink-soft/70")} />
                <span>Overview</span>
              </div>
              {activeTab === "overview" && <div className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
            </button>
          </div>

          {/* Group 1: Personal Settings */}
          <div className="pt-2 border-t border-line/60">
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Personal Settings
              </span>
            </div>
            <nav className="space-y-0.5">
              {PERSONAL_SETTINGS.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectTab(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      isActive
                        ? "bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-2xs"
                        : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", isActive ? "text-brand-700" : "text-ink-soft/70")} />
                      <span>{cat.label}</span>
                    </div>
                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: Workspace Settings */}
          <div className="mt-3 pt-2 border-t border-line/60">
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/80">
                Workspace Settings
              </span>
            </div>
            <nav className="space-y-0.5">
              {WORKSPACE_SETTINGS.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectTab(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                      isActive
                        ? "bg-brand-50 text-brand-700 font-bold border border-brand-200/60 shadow-2xs"
                        : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", isActive ? "text-brand-700" : "text-ink-soft/70")} />
                      <span>{cat.label}</span>
                    </div>
                    {isActive && <div className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Account Session Actions: Log Out */}
          <div className="mt-3 pt-3 border-t border-line/60 px-1">
            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Horizontal Scrollable Tab Bar */}
        <div className="md:hidden w-full overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1.5 rounded-2xl border border-line bg-surface shadow-xs">
          {SETTINGS_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectTab(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  isActive
                    ? "bg-brand-50 text-brand-700 font-bold border border-brand-200/60"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-brand-700" : "text-ink-soft")} />
                <span>{cat.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition-all shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-600" />
            <span>Log out</span>
          </button>
        </div>

        {/* Category Content Area */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Breadcrumb Header when inside a category */}
          {activeTab !== "overview" && (
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectTab("overview")}
                  className="text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                >
                  Settings
                </button>
                <span className="text-ink-soft/60">/</span>
                <span className="font-bold text-ink">{currentCategory.label}</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSelectTab("overview")}
                className="text-ink-soft hover:text-ink"
              >
                ← Back to Overview
              </Button>
            </div>
          )}

          {/* Active Category Panel */}
          {activeTab === "overview" && (
            <SettingsOverview
              user={user}
              activeOrg={activeOrg}
              onSelectTab={handleSelectTab}
              onOpenLogout={() => setLogoutModalOpen(true)}
            />
          )}

          {activeTab === "profile" && (
            <ProfileCard user={user} updateUser={updateUser} activeOrg={activeOrg} />
          )}

          {activeTab === "workspace" && (
            <WorkspaceIdentityCard user={user} activeOrg={activeOrg} switchOrganization={switchOrganization} />
          )}

          {activeTab === "team" && (
            <RbacPermissionsCard user={user} updateUser={updateUser} activeOrg={activeOrg} />
          )}

          {activeTab === "billing" && (
            <BillingCard user={user} activeOrg={activeOrg} />
          )}

          {activeTab === "security" && (
            <SecurityCard onOpenLogout={() => setLogoutModalOpen(true)} />
          )}

          {activeTab === "integrations" && (
            <IntegrationsCard user={user} />
          )}

          {activeTab === "data" && (
            <DataManagementCard />
          )}

          {activeTab === "audit" && (
            <AuditStreamCard user={user} onOpenLogout={() => setLogoutModalOpen(true)} activeOrg={activeOrg} />
          )}
        </main>
      </div>

      {/* Confirmation Dialog for Session Logout */}
      <ConfirmDialog
        open={logoutModalOpen}
        onClose={() => !isLoggingOut && setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Log out of RevFlux?"
        description="Are you sure you want to end your current session on this device?"
        confirmLabel="Log out"
        loading={isLoggingOut}
      />
    </div>
  );
}

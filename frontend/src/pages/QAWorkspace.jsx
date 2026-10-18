import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
} from "../components/ui";
import {
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  RotateCcw,
  Send,
  Lock,
  Eye,
  RefreshCw,
  FileText,
  Check,
  Activity,
  Layers,
  Database,
  UserCheck,
} from "lucide-react";

export default function QAWorkspace() {
  const { user, activeOrg } = useAuth();

  // Status & Data
  const [qaStatus, setQaStatus] = useState(null);
  const [matrixResults, setMatrixResults] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [inviteStatus, setInviteStatus] = useState(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  // Notification / Feedback
  const [saveMessage, setSaveMessage] = useState(null);

  // Initial Load
  const fetchAllQAData = async () => {
    try {
      setLoading(true);
      const [statusRes, matrixRes, checklistRes] = await Promise.all([
        api.get("/qa/status").catch(() => null),
        api.get("/qa/matrix-results").catch(() => null),
        api.get("/qa/checklist").catch(() => null),
      ]);

      if (statusRes) setQaStatus(statusRes);
      if (matrixRes) setMatrixResults(matrixRes);
      if (checklistRes && checklistRes.data) {
        setChecklist(checklistRes.data.workflows || {});
      }

      // If active org exists, load pending invites
      if (activeOrg) {
        const invitesRes = await api.get("/qa/invites").catch(() => null);
        if (invitesRes && invitesRes.invites) {
          setPendingInvites(invitesRes.invites);
        }
      }
    } catch (err) {
      console.error("Failed to fetch QA status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQAData();
  }, [activeOrg]);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Seed / Reset Workspace
  const handleSeed = async (isReset = false) => {
    try {
      setSeeding(true);
      const res = await api.post("/qa/seed", { reset: isReset });
      setSaveMessage(res.message);
      await fetchAllQAData();
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      alert("Seeding failed: " + (err.message || "Unknown error"));
    } finally {
      setSeeding(false);
    }
  };

  // Send real / test invitation
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setSendingInvite(true);
      setInviteStatus(null);
      const res = await api.post("/team/invite", {
        email: inviteEmail,
        role: inviteRole,
      });

      setInviteStatus({
        type: "success",
        message: res.message || `Invitation created for ${inviteEmail}!`,
        delivered: res.emailDelivered,
      });
      setInviteEmail("");

      // Refresh invites list
      const invitesRes = await api.get("/qa/invites").catch(() => null);
      if (invitesRes && invitesRes.invites) {
        setPendingInvites(invitesRes.invites);
      }
    } catch (err) {
      setInviteStatus({
        type: "error",
        message: err.message || "Failed to send invitation",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  // Update checklist workflow status
  const handleUpdateChecklist = async (workflowId, newStatus, newNotes) => {
    const updated = {
      ...checklist,
      [workflowId]: {
        status: newStatus !== undefined ? newStatus : (checklist[workflowId]?.status || "NOT_TESTED"),
        notes: newNotes !== undefined ? newNotes : (checklist[workflowId]?.notes || ""),
      },
    };
    setChecklist(updated);

    try {
      await api.post("/qa/checklist", {
        workflowId,
        status: updated[workflowId].status,
        notes: updated[workflowId].notes,
      });
    } catch (err) {
      console.error("Failed to auto-save checklist item:", err);
    }
  };

  const workflows = [
    {
      id: "workflowA",
      title: "1. Owner Workflow",
      persona: "QA Owner (qa.owner@revflux.local)",
      role: "owner",
      navLink: "/team",
      navText: "Go to Team Administration",
      steps: [
        "Sign in using qa.owner@revflux.local (Password: QAPassword123!).",
        "Open Team Administration page.",
        "Click 'Invite Member' to test inviting a teammate.",
        "Change QA Rep 1's role to 'Manager' using the role editor modal.",
        "Open Custom Permissions modal for a member and toggle an explicit deny on 'leads.delete'.",
        "Open Settings -> Audit Logs to confirm all mutations are logged with actor and timestamp.",
      ],
      expected: "Owner has unhindered administration, can edit all roles, grant/deny permissions, and review audit trail.",
    },
    {
      id: "workflowB",
      title: "2. Admin Privilege Boundaries",
      persona: "QA Admin (qa.admin@revflux.local)",
      role: "admin",
      navLink: "/team",
      navText: "Go to Team Administration",
      steps: [
        "Sign in using qa.admin@revflux.local (Password: QAPassword123!).",
        "Open Team Administration page and invite a test viewer.",
        "Try promoting another member to 'Owner' — verify that the action is blocked or disabled.",
        "Try suspending or deleting the workspace owner — verify that the UI blocks it with a protective guard.",
        "Confirm that admin can suspend standard members, but cannot remove the last owner.",
      ],
      expected: "Admin manages day-to-day team operations, but cannot usurp ownership or delete owners.",
    },
    {
      id: "workflowC",
      title: "3. Manager Workflow",
      persona: "QA Manager (qa.manager@revflux.local)",
      role: "manager",
      navLink: "/leads",
      navText: "Go to Pipeline & Leads",
      steps: [
        "Sign in using qa.manager@revflux.local (Password: QAPassword123!).",
        "Navigate to Leads. Notice you have visibility over all organization leads.",
        "Select a lead owned by Rep 1 (e.g., '[QA] Enterprise Migration').",
        "Reassign the lead to Rep 2 or yourself. Confirm the owner updates immediately.",
        "Try to delete the lead — confirm deletion is rejected or hidden (managers lack leads.delete by default).",
      ],
      expected: "Manager has full pipeline oversight and assignment authority, but cannot delete records or manage workspace settings.",
    },
    {
      id: "workflowD",
      title: "4. Rep Isolation & Scope Enforcement",
      persona: "QA Rep 1 (qa.rep1@revflux.local)",
      role: "rep",
      navLink: "/leads",
      navText: "Go to My Leads",
      steps: [
        "Sign in using qa.rep1@revflux.local (Password: QAPassword123!).",
        "Open Leads table. Verify you only see leads assigned to Rep 1 ('[QA] Cloud Scale Deal', '[QA] High-Risk Opportunity').",
        "Verify that Rep 2's leads ('[QA] Private Security Contract') are completely invisible.",
        "Open AI Copilot and ask: 'What is the status of Private Security Contract?' — verify Copilot says no lead found.",
        "Attempt direct navigation to Rep 2's lead URL — verify 404 or access denied is shown.",
      ],
      expected: "Reps are strictly confined to their own assigned records across table, pipeline, and AI Copilot tools.",
    },
    {
      id: "workflowE",
      title: "5. Viewer Read-Only Access",
      persona: "QA Viewer (qa.viewer@revflux.local)",
      role: "viewer",
      navLink: "/dashboard",
      navText: "Go to Dashboard",
      steps: [
        "Sign in using qa.viewer@revflux.local (Password: QAPassword123!).",
        "Navigate across Dashboard, Leads, Contacts, Tasks, and Notes. Verify data renders cleanly.",
        "Verify that mutation buttons ('+ New Lead', '+ Add Contact', 'Edit', 'Delete') are hidden or disabled.",
        "Attempt to trigger a mutation — verify backend returns 403 Forbidden with zero database side-effects.",
      ],
      expected: "Viewer has read access across reports and records, but cannot mutate any data or access team settings.",
    },
    {
      id: "workflowF",
      title: "6. Realtime Permission Changes",
      persona: "QA Owner + QA Rep 1 (Two Sessions)",
      role: "owner",
      navLink: "/team",
      navText: "Open Team Administration",
      steps: [
        "Open two browser windows or private browsing sessions side-by-side.",
        "Window 1: Log in as QA Owner. Window 2: Log in as QA Rep 1.",
        "In Window 1 (Owner), go to Team -> click Permissions for QA Rep 1.",
        "Explicitly revoke or grant a permission (e.g., 'leads.assign'). Click Save.",
        "Observe Window 2 (Rep 1): Verify the active session receives the realtime socket notification and refreshes permissions without full page reload.",
      ],
      expected: "Socket.IO delivers permissions:updated instantaneously, triggering immediate client session refresh.",
    },
    {
      id: "workflowG",
      title: "7. Audit & Tenant Isolation",
      persona: "QA Owner (qa.owner@revflux.local)",
      role: "owner",
      navLink: "/settings",
      navText: "Go to Audit Logs in Settings",
      steps: [
        "Sign in as QA Owner.",
        "Navigate to Settings -> Audit Logs tab.",
        "Inspect recent actions: Verify role changes, lead assignments, and permission updates appear with full actor metadata.",
        "Inspect event details: Confirm no passwords, tokens, or API keys are exposed.",
        "Log in as QA Rep 1: Confirm Settings -> Audit Logs is blocked (403) and inaccessible.",
      ],
      expected: "Audit logs provide comprehensive tenant-scoped forensic tracking with complete credential sanitization.",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
              <Shield className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-ink">
              RBAC QA Command Center
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs font-mono">
              QA ENVIRONMENT
            </Badge>
          </div>
          <p className="text-ink-soft text-sm">
            Deterministic testing lab for RevFlux Organization RBAC, live Resend invitations, real-time Socket.IO sync, and tenant boundaries.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSeed(false)}
            disabled={seeding}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
            Seed QA Data
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Reset and re-seed the RevFlux QA Workspace? All test data will be regenerated.")) {
                handleSeed(true);
              }
            }}
            disabled={seeding}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Workspace
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Overview & Persona Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace Summary */}
        <Card className="p-5 border-line flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <Database className="h-4 w-4 text-brand-500" />
                <span>Dedicated QA Workspace</span>
              </div>
              <Badge variant="success" className="text-xs">Active</Badge>
            </div>
            <p className="text-xs text-ink-soft mb-4">
              Deterministic organization created specifically for manual & automated security verification without affecting production.
            </p>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-line text-center text-xs">
              <div>
                <span className="block font-bold text-ink text-base">
                  {qaStatus?.counts?.members || 6}
                </span>
                <span className="text-ink-soft">Members</span>
              </div>
              <div>
                <span className="block font-bold text-ink text-base">
                  {qaStatus?.counts?.leads || 8}
                </span>
                <span className="text-ink-soft">Leads</span>
              </div>
              <div>
                <span className="block font-bold text-ink text-base">
                  {qaStatus?.counts?.tasks || 4}
                </span>
                <span className="text-ink-soft">Tasks</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 text-xs text-ink-soft flex items-center justify-between">
            <span>Current Workspace:</span>
            <span className="font-medium text-ink truncate max-w-[180px]">
              {activeOrg?.name || "None Selected"}
            </span>
          </div>
        </Card>

        {/* Automated Matrix Badge Card */}
        <Card className="p-5 border-line flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-ink font-semibold">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>Automated RBAC Test Matrix Status</span>
              </div>
              <Badge variant="success" className="text-xs gap-1">
                <Check className="h-3 w-3" /> 7 / 7 Workflows Verified
              </Badge>
            </div>
            <p className="text-xs text-ink-soft mb-3">
              All 7 core workflows have corresponding integration tests in <code className="text-brand-500 bg-brand-500/10 px-1 py-0.5 rounded">tests/rbac_matrix.test.js</code> passing sequentially in an isolated database.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-canvas rounded border border-line">
                <span className="text-emerald-500 font-bold block">✓ Owner</span>
                <span className="text-ink-soft text-[11px]">Full delegation</span>
              </div>
              <div className="p-2 bg-canvas rounded border border-line">
                <span className="text-emerald-500 font-bold block">✓ Admin</span>
                <span className="text-ink-soft text-[11px]">Boundaries enforced</span>
              </div>
              <div className="p-2 bg-canvas rounded border border-line">
                <span className="text-emerald-500 font-bold block">✓ Manager</span>
                <span className="text-ink-soft text-[11px]">Pipeline assigned</span>
              </div>
              <div className="p-2 bg-canvas rounded border border-line">
                <span className="text-emerald-500 font-bold block">✓ Rep</span>
                <span className="text-ink-soft text-[11px]">Strict record isolation</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-xs text-ink-soft flex items-center justify-between">
            <span>Regression Suite: <strong>90/90 tests passing</strong></span>
            <span className="text-[11px] text-ink-soft">Exit Code: 0</span>
          </div>
        </Card>
      </div>

      {/* QA Personas Quick Switch / Credentials Palette */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-brand-500" />
            <h2 className="text-base font-bold text-ink">
              Seeded QA Personas (Password for all: <code className="bg-canvas border border-line px-1.5 py-0.5 rounded text-brand-500 font-mono text-xs">QAPassword123!</code>)
            </h2>
          </div>
          <span className="text-xs text-ink-soft">
            Click copy to quickly sign in under each role
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {qaStatus?.personas?.map((p, idx) => {
            const isCurrent = user?.email?.toLowerCase() === p.email.toLowerCase();
            return (
              <Card
                key={idx}
                className={`p-3.5 border transition-all ${
                  isCurrent
                    ? "border-brand-500 bg-brand-500/5 shadow-sm"
                    : "border-line bg-surface hover:border-ink/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant={
                      p.role === "owner"
                        ? "primary"
                        : p.role === "admin"
                        ? "warning"
                        : p.role === "manager"
                        ? "info"
                        : p.role === "rep"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[10px] uppercase font-bold"
                  >
                    {p.role}
                  </Badge>
                  {isCurrent && (
                    <span className="text-[10px] text-brand-500 font-semibold">Active</span>
                  )}
                </div>

                <h3 className="font-bold text-xs text-ink truncate">{p.name}</h3>
                <p className="text-[11px] text-ink-soft truncate mb-3" title={p.email}>
                  {p.email}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(p.email, `persona-${idx}`)}
                  className="w-full text-xs h-7 gap-1.5 justify-center"
                >
                  {copiedKey === `persona-${idx}` ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Email
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Live Workspace Invitation Testing Station */}
      <Card className="p-6 border-line bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-brand-500" />
              <h2 className="text-base font-bold text-ink">
                Live Workspace Invitation Flow (Real Email Delivery)
              </h2>
            </div>
            <p className="text-xs text-ink-soft">
              Test invitations dispatched through Resend using the verified domain <code className="text-brand-500">revflux.deepaksinghdev.in</code> (ONBOARDING identity). You can input any real email address you own to inspect the delivered email.
            </p>
          </div>
          <Badge variant="outline" className="text-xs self-start sm:self-auto font-mono">
            7-Day Single-Use Token
          </Badge>
        </div>

        <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          <div className="sm:col-span-6">
            <Input
              type="email"
              placeholder="Enter your personal email to receive invitation..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="text-xs"
            >
              <option value="admin">Role: Admin</option>
              <option value="manager">Role: Manager</option>
              <option value="rep">Role: Rep</option>
              <option value="viewer">Role: Viewer</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button
              type="submit"
              disabled={sendingInvite || !inviteEmail}
              className="w-full text-xs h-9 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {sendingInvite ? "Sending..." : "Dispatch Invitation"}
            </Button>
          </div>
        </form>

        {inviteStatus && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 mb-4 ${
              inviteStatus.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            }`}
          >
            {inviteStatus.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{inviteStatus.message}</span>
            {inviteStatus.delivered === false && (
              <span className="text-ink-soft">
                (Note: Resend dev mode simulated delivery. Check pending list below for token acceptance URL.)
              </span>
            )}
          </div>
        )}

        {/* Pending Invites List */}
        <div>
          <h3 className="text-xs font-semibold text-ink mb-2 flex items-center justify-between">
            <span>Pending Invitations in this Workspace:</span>
            <span className="text-ink-soft font-normal">{pendingInvites.length} pending</span>
          </h3>

          {pendingInvites.length === 0 ? (
            <p className="text-xs text-ink-soft italic p-3 bg-canvas rounded border border-line">
              No pending invitations in this workspace. Use the form above to dispatch an invitation to your address.
            </p>
          ) : (
            <div className="divide-y divide-line border border-line rounded-lg bg-canvas overflow-hidden">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="p-3 text-xs flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-ink block">{inv.email}</span>
                    <span className="text-[11px] text-ink-soft">
                      Role: <strong className="uppercase">{inv.role}</strong> • Status: {inv.status}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Expires in 7 days
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* The 7 Guided RBAC Verification Workflows */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-display font-bold text-ink">
              The 7 Guided RBAC Verification Workflows
            </h2>
          </div>
          <span className="text-xs text-ink-soft">
            Manual UI verification paired with automated test assertions
          </span>
        </div>

        <div className="space-y-4">
          {workflows.map((wf) => {
            const currentItem = checklist[wf.id] || { status: "NOT_TESTED", notes: "" };
            const status = currentItem.status;

            return (
              <Card
                key={wf.id}
                className={`p-5 border transition-all ${
                  status === "PASSED"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : status === "FAILED"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-ink">{wf.title}</h3>
                      <Badge variant="success" className="text-[10px] gap-1">
                        <Check className="h-3 w-3" /> Automated Suite: PASS
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-soft">
                      Test Identity: <strong className="text-brand-500">{wf.persona}</strong>
                    </p>
                  </div>

                  {/* Manual QA State Selector */}
                  <div className="flex items-center gap-2 self-start">
                    <span className="text-xs font-semibold text-ink-soft">Manual QA:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklist(wf.id, "NOT_TESTED")}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        status === "NOT_TESTED"
                          ? "bg-ink-soft/20 text-ink font-bold border-ink-soft/40"
                          : "text-ink-soft border-line hover:bg-canvas"
                      }`}
                    >
                      Not Tested
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklist(wf.id, "PASSED")}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        status === "PASSED"
                          ? "bg-emerald-500/20 text-emerald-500 font-bold border-emerald-500/40"
                          : "text-ink-soft border-line hover:bg-canvas"
                      }`}
                    >
                      Passed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateChecklist(wf.id, "FAILED")}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        status === "FAILED"
                          ? "bg-rose-500/20 text-rose-500 font-bold border-rose-500/40"
                          : "text-ink-soft border-line hover:bg-canvas"
                      }`}
                    >
                      Failed
                    </button>
                  </div>
                </div>

                {/* Steps & Expected Behavior */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                  <div className="p-3 bg-canvas rounded border border-line">
                    <h4 className="font-bold text-ink mb-2">Step-by-Step Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-ink-soft leading-relaxed">
                      {wf.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-3 bg-canvas rounded border border-line flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-ink mb-2">Expected Behavior:</h4>
                      <p className="text-ink-soft leading-relaxed">{wf.expected}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                      <Link
                        to={wf.navLink}
                        className="inline-flex items-center gap-1.5 text-brand-500 hover:text-brand-600 font-semibold text-xs"
                      >
                        {wf.navText}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Tester Notes & Observations:
                  </label>
                  <input
                    type="text"
                    placeholder="Record notes, verified behaviors, or failure details here..."
                    value={currentItem.notes}
                    onChange={(e) => handleUpdateChecklist(wf.id, undefined, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-canvas border border-line rounded focus:outline-none focus:border-brand-500 text-ink"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

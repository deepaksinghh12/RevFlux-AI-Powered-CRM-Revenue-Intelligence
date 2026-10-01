import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Briefcase,
  Building,
  Mail,
  UserCheck,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  Input,
  Field,
  Select,
  Spinner,
  Dialog,
} from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { teamApi } from "../lib/services";
import { toast } from "sonner";
import { shortDate } from "../lib/format";
import { cn } from "../lib/utils";

const ROLES_META = {
  superadmin: {
    title: "RevFlux Super Admin",
    color: "bg-indigo-900 text-white border-indigo-700",
    desc: "Platform vendor administrator",
    permissions: ["Cross-Tenant Control", "Global API Keys", "System Auditing"],
  },
  owner: {
    title: "Business Owner",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Purchased subscription & owns billing",
    permissions: ["Manage Billing & Razorpay", "Assign Team Roles", "Lead Deletion", "Full AI Tools"],
  },
  ops_head: {
    title: "Operations Head",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Manages data pipelines & workflow rules",
    permissions: ["CSV Data Ingestion", "CRM Cadences", "Audit Logs", "Manage Reps"],
  },
  manager: {
    title: "Sales Manager",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Oversees reps, pipeline & deal quotas",
    permissions: ["Pipeline Control", "Task Assignment", "AI Risk Analytics", "Team Reports"],
  },
  rep: {
    title: "Sales Representative",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Front-line deal & task execution",
    permissions: ["Assigned Lead Management", "Log Notes & Tasks", "AI Email Outreach"],
  },
};

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "rep",
    jobTitle: "Sales Representative",
    department: "Sales",
  });

  // Edit Role Modal State
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newRole, setNewRole] = useState("rep");

  const [submitting, setSubmitting] = useState(false);

  const currentUserRole = user?.role || "owner";
  const canInvite = ["owner", "ops_head", "superadmin"].includes(currentUserRole);
  const canManageRoles = ["owner", "superadmin"].includes(currentUserRole);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await teamApi.getMembers();
      setMembers(res?.members || []);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await teamApi.inviteMember(inviteForm);
      toast.success(res.message || "Team member invited!");
      setInviteModalOpen(false);
      setInviteForm({
        name: "",
        email: "",
        role: "rep",
        jobTitle: "Sales Representative",
        department: "Sales",
      });
      loadTeam();
    } catch (err) {
      toast.error(err?.message || "Failed to invite team member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      const res = await teamApi.updateRole(selectedMember.id, { role: newRole });
      toast.success(res.message || "Role updated successfully!");
      setEditRoleModalOpen(false);
      loadTeam();
    } catch (err) {
      toast.error(err?.message || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) return;
    try {
      await teamApi.removeMember(memberId);
      toast.success(`Removed ${memberName}`);
      loadTeam();
    } catch (err) {
      toast.error(err?.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Team Members & RBAC Access Control"
        subtitle="Manage your organization's team members, assign RBAC roles, and inspect granular workspace permissions."
      />

      {/* Top Action & Role Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-brand-50 text-brand-700 font-bold border border-brand-200 uppercase text-[10px]">
            Your Role: {currentUserRole}
          </Badge>
          <span className="text-xs text-ink-soft">
            Total Team Size: <strong className="text-ink font-semibold">{members.length} Members</strong>
          </span>
        </div>

        {canInvite && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Invite Team Member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" className="mx-auto text-brand-600 mb-3" />
          <p className="text-xs text-ink-soft">Loading workspace team members…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const roleMeta = ROLES_META[m.role] || ROLES_META.rep;
            const isSelf = m.id === user?.id;

            return (
              <Card key={m.id} className="shadow-xs hover:border-brand-300 transition flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} src={m.avatar} size="md" className="ring-2 ring-brand-500/20" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-ink text-sm">{m.name}</h4>
                          {isSelf && <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">You</Badge>}
                        </div>
                        <p className="text-xs text-ink-soft">{m.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-ink-soft font-medium">Assigned Role:</span>
                      <Badge className={cn("capitalize font-bold text-[10px] px-2 py-0.5 border", roleMeta.color)}>
                        {roleMeta.title}
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-line bg-surface-muted/50 p-2.5 space-y-1 text-xs">
                      <p className="font-semibold text-ink flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-brand-600" /> {m.jobTitle}
                      </p>
                      <p className="text-[11px] text-ink-soft flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-ink-soft/60" /> {m.department}
                      </p>
                    </div>

                    {/* Permissions list */}
                    <div className="space-y-1 text-[11px] text-ink-soft">
                      <p className="font-bold text-ink uppercase tracking-wider text-[10px] mb-1">Capabilities:</p>
                      {roleMeta.permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {canManageRoles && !isSelf && (
                    <div className="flex items-center justify-between pt-3 border-t border-line mt-3">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setSelectedMember(m);
                          setNewRole(m.role);
                          setEditRoleModalOpen(true);
                        }}
                      >
                        Change Role
                      </Button>

                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal: Invite Team Member ─────────────────────────────── */}
      <Dialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member to Workspace"
        className="max-w-md"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
          <Field label="Full Name">
            <Input
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              placeholder="e.g. Ananya Roy"
              required
            />
          </Field>

          <Field label="Email Address">
            <Input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="ananya@company.com"
              required
            />
          </Field>

          <Field label="Job Title">
            <Input
              value={inviteForm.jobTitle}
              onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
              placeholder="Senior Account Executive"
            />
          </Field>

          <Field label="Department">
            <Input
              value={inviteForm.department}
              onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
              placeholder="Sales / Growth"
            />
          </Field>

          <Field label="Assign RBAC Role">
            <Select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <option value="rep">Sales Representative (Employee)</option>
              <option value="manager">Sales Manager (Team Lead)</option>
              <option value="ops_head">Operations Head (RevOps Director)</option>
              <option value="owner">Business Owner (Co-Founder)</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Invite Member
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Change Role ───────────────────────────────────── */}
      <Dialog
        open={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        title={`Update Role for ${selectedMember?.name}`}
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <Field label="Select New RBAC Role">
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="rep">Sales Representative (Employee)</option>
              <option value="manager">Sales Manager (Team Lead)</option>
              <option value="ops_head">Operations Head (RevOps Director)</option>
              <option value="owner">Business Owner (Client CEO)</option>
            </Select>
          </Field>

          {/* Role capability preview */}
          {ROLES_META[newRole] && (
            <div className="rounded-xl border border-line bg-surface-muted/60 p-3 space-y-1 text-xs">
              <p className="font-bold text-ink">{ROLES_META[newRole].title}</p>
              <p className="text-ink-soft">{ROLES_META[newRole].desc}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setEditRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} loading={submitting}>
              Save Role Assignment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

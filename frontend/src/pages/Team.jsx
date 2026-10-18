import { useEffect, useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Briefcase,
  Building,
  Mail,
  UserCheck,
  Sparkles,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Check,
  Ban,
  RotateCcw,
  UserX,
  Copy,
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
import { usePermission } from "../hooks/usePermission";
import { teamApi } from "../lib/services";
import { toast } from "sonner";
import { shortDate } from "../lib/format";
import { cn } from "../lib/utils";

const PERMISSION_GROUPS = [
  {
    name: "Leads Management",
    permissions: [
      { id: "leads.read", label: "View Leads", desc: "Browse and view CRM leads" },
      { id: "leads.create", label: "Create Leads", desc: "Add new leads to pipeline" },
      { id: "leads.update", label: "Update Leads", desc: "Modify lead fields and stages" },
      { id: "leads.delete", label: "Delete Leads", desc: "Remove leads from CRM" },
      { id: "leads.assign", label: "Assign & Reassign Leads", desc: "Allocate leads to team members" },
      { id: "leads.import", label: "Import Bulk Leads", desc: "Bulk CSV/Excel ingestion" },
    ],
  },
  {
    name: "Contacts & Collaboration",
    permissions: [
      { id: "contacts.read", label: "View Contacts", desc: "Access contact records" },
      { id: "contacts.create", label: "Create Contacts", desc: "Add new contact cards" },
      { id: "contacts.update", label: "Update Contacts", desc: "Edit contact details" },
      { id: "contacts.delete", label: "Delete Contacts", desc: "Remove contacts" },
    ],
  },
  {
    name: "Tasks & Activities",
    permissions: [
      { id: "tasks.read", label: "View Tasks", desc: "Inspect pending and completed tasks" },
      { id: "tasks.create", label: "Create Tasks", desc: "Schedule follow-up tasks" },
      { id: "tasks.update", label: "Update Tasks", desc: "Mark done or edit task due dates" },
      { id: "tasks.delete", label: "Delete Tasks", desc: "Discard task items" },
    ],
  },
  {
    name: "Notes & Timeline",
    permissions: [
      { id: "notes.read", label: "View Notes", desc: "Read lead timeline notes" },
      { id: "notes.create", label: "Create Notes", desc: "Log notes and call summaries" },
      { id: "notes.update", label: "Update Notes", desc: "Modify previously logged notes" },
      { id: "notes.delete", label: "Delete Notes", desc: "Delete timeline notes" },
    ],
  },
  {
    name: "Outreach & Cadences",
    permissions: [
      { id: "outreach.manage", label: "Manage Outreach Sequences", desc: "Create, edit, and toggle cadences" },
    ],
  },
  {
    name: "AI & Reporting",
    permissions: [
      { id: "ai.features", label: "AI Copilot Features", desc: "Access Copilot chat, deal scoring, & drafts" },
      { id: "reports.read", label: "Analytics & Executive Reports", desc: "View pipeline metrics and win rates" },
      { id: "export.data", label: "Export Workspace Data", desc: "Download CSV backups and reports" },
    ],
  },
  {
    name: "Team & Organization Admin",
    permissions: [
      { id: "team.read", label: "View Team Members", desc: "Browse workspace members" },
      { id: "team.invite", label: "Invite Members", desc: "Send invitations to join workspace" },
      { id: "team.manage_roles", label: "Manage Roles & Permissions", desc: "Modify member roles & overrides" },
      { id: "org.update_settings", label: "Update Organization Settings", desc: "Rename workspace & config" },
    ],
  },
];

const CANONICAL_ROLES_BASE = {
  owner: ["*"],
  admin: [
    "leads.read", "leads.create", "leads.update", "leads.delete", "leads.import", "leads.assign",
    "contacts.read", "contacts.create", "contacts.update", "contacts.delete",
    "tasks.read", "tasks.create", "tasks.update", "tasks.delete",
    "notes.read", "notes.create", "notes.update", "notes.delete",
    "outreach.manage",
    "team.read", "team.invite", "team.manage_roles",
    "org.update_settings",
    "ai.features",
    "reports.read",
    "export.data"
  ],
  manager: [
    "leads.read", "leads.create", "leads.update", "leads.assign",
    "contacts.read", "contacts.create", "contacts.update",
    "tasks.read", "tasks.create", "tasks.update",
    "notes.read", "notes.create", "notes.update",
    "team.read",
    "ai.features",
    "reports.read"
  ],
  rep: [
    "leads.read", "leads.create", "leads.update",
    "contacts.read", "contacts.create", "contacts.update",
    "tasks.read", "tasks.create", "tasks.update",
    "notes.read", "notes.create", "notes.update",
    "team.read",
    "ai.features"
  ],
  viewer: [
    "leads.read",
    "contacts.read",
    "tasks.read",
    "notes.read",
    "team.read",
    "reports.read"
  ]
};

const ROLES_META = {
  owner: {
    title: "Workspace Owner",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Full workspace control, billing & member administration",
  },
  admin: {
    title: "Administrator",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Manages team, outreach cadences, imports & workspace config",
  },
  manager: {
    title: "Sales Manager",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Oversees reps, team pipeline allocation & performance",
  },
  rep: {
    title: "Sales Representative",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Front-line assigned deal execution, contacts & task follow-ups",
  },
  viewer: {
    title: "Viewer",
    color: "bg-gray-50 text-gray-600 border-gray-200",
    desc: "Read-only access across CRM records and analytics",
  },
};

export default function Team() {
  const { user, activeOrg } = useAuth();
  const { hasPermission } = usePermission();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

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

  // Custom Permissions Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [customOverrides, setCustomOverrides] = useState({}); // { [permKey]: boolean | null }

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    variant: "danger",
    actionLabel: "Confirm",
    onConfirm: () => {},
  });

  const [submitting, setSubmitting] = useState(false);

  const currentUserRole = activeOrg?.role || "rep";
  const isOwner = currentUserRole === "owner";
  const canInvite = hasPermission("team.invite") || isOwner;
  const canManageRoles = hasPermission("team.manage_roles") || isOwner;

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await teamApi.getMembers();
      setMembers(res?.members || []);
    } catch (err) {
      toast.error(err?.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Paginated Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.memberId && m.memberId.toLowerCase().includes(q)) ||
        (m.jobTitle && m.jobTitle.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q));

      const matchRole = roleFilter === "all" || m.role === roleFilter;
      const matchStatus = statusFilter === "all" || m.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, page, pageSize]);

  // Handle Invite Submission
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

  // Handle Role Change
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

  // Toggle Suspend / Reactivate
  const handleToggleStatus = (member) => {
    const nextStatus = member.status === "suspended" ? "active" : "suspended";
    const actionWord = nextStatus === "active" ? "reactivate" : "suspend";

    setConfirmDialog({
      open: true,
      title: `${actionWord.toUpperCase()} Team Member`,
      message: `Are you sure you want to ${actionWord} ${member.name} (${member.email})? ${
        nextStatus === "suspended"
          ? "Suspended members lose immediate access to all CRM resources and real-time feeds."
          : "Reactivated members will immediately regain workspace access."
      }`,
      variant: nextStatus === "suspended" ? "danger" : "primary",
      actionLabel: `${nextStatus === "active" ? "Reactivate" : "Suspend"} Member`,
      onConfirm: async () => {
        try {
          const res = await teamApi.toggleStatus(member.id, { status: nextStatus });
          toast.success(res.message || `Member ${nextStatus}`);
          loadTeam();
        } catch (err) {
          toast.error(err?.message || `Failed to ${actionWord} member`);
        }
      },
    });
  };

  // Handle Remove Member
  const handleRemoveMember = (member) => {
    setConfirmDialog({
      open: true,
      title: "Remove Team Member",
      message: `Are you sure you want to remove ${member.name} from ${activeOrg?.name || "this workspace"}? Their membership will be revoked.`,
      variant: "danger",
      actionLabel: "Remove Member",
      onConfirm: async () => {
        try {
          const res = await teamApi.removeMember(member.id);
          toast.success(res.message || `Removed ${member.name}`);
          loadTeam();
        } catch (err) {
          toast.error(err?.message || "Failed to remove member");
        }
      },
    });
  };

  // Open Permission Matrix Editor
  const handleOpenPermEditor = (member) => {
    setTargetMember(member);
    const overridesMap = {};
    if (Array.isArray(member.customPermissions)) {
      member.customPermissions.forEach((cp) => {
        overridesMap[cp.permission] = cp.granted;
      });
    }
    setCustomOverrides(overridesMap);
    setPermModalOpen(true);
  };

  // Save Custom Permission Overrides
  const handleSavePermissions = async () => {
    if (!targetMember) return;
    setSubmitting(true);

    const payload = Object.entries(customOverrides)
      .filter(([, val]) => typeof val === "boolean")
      .map(([permission, granted]) => ({ permission, granted }));

    try {
      const res = await teamApi.updatePermissions(targetMember.id, { customPermissions: payload });
      toast.success(res.message || "Custom permissions updated!");
      setPermModalOpen(false);
      loadTeam();
    } catch (err) {
      toast.error(err?.message || "Failed to update custom permissions");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Team Members & Organization Access Control"
        subtitle="Manage your organization's members, assign RBAC roles, configure granular custom permission overrides, and inspect audit activity."
      />

      {/* Top Action & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-brand-50 text-brand-700 font-bold border border-brand-200 uppercase text-[10px]">
            Your Role: {currentUserRole}
          </Badge>
          <span className="text-xs text-ink-soft">
            Total Team: <strong className="text-ink font-semibold">{members.length} Members</strong>
          </span>
          {members.filter((m) => m.status === "suspended").length > 0 && (
            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
              {members.filter((m) => m.status === "suspended").length} Suspended
            </Badge>
          )}
        </div>

        {canInvite && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite Team Member
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-line shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, department…"
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="rep">Rep</option>
            <option value="viewer">Viewer</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </div>

      {/* Team Member Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Spinner size="lg" className="mx-auto text-brand-600 mb-3" />
          <p className="text-xs text-ink-soft">Loading workspace team members…</p>
        </div>
      ) : paginatedMembers.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <Users className="mx-auto h-10 w-10 text-ink-soft/40 mb-3" />
          <h3 className="font-display font-bold text-ink">No members found</h3>
          <p className="text-xs text-ink-soft mt-1">
            {search || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search query or role filters."
              : "Invite colleagues to start collaborating in this workspace."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedMembers.map((m) => {
            const roleMeta = ROLES_META[m.role] || ROLES_META.rep;
            const isSelf = m.id === user?.id;
            const isOwnerMember = m.role === "owner";
            const isSuspended = m.status === "suspended";
            const isPendingInvite = m.status === "invited";

            return (
              <Card
                key={m.membershipId || m.id || m.email}
                className={cn(
                  "shadow-xs transition flex flex-col justify-between border-line",
                  isSuspended && "opacity-60 bg-surface-muted/30 border-rose-200"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={m.name} src={m.avatar} size="md" className="ring-2 ring-brand-500/10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-ink text-sm truncate">{m.name}</h4>
                          {isSelf && <Badge className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0">You</Badge>}
                        </div>
                        <p className="text-xs text-ink-soft truncate">{m.email}</p>
                      </div>
                    </div>

                    {isSuspended ? (
                      <Badge className="bg-rose-100 text-rose-800 text-[9px] border border-rose-200 shrink-0">
                        Suspended
                      </Badge>
                    ) : isPendingInvite ? (
                      <Badge className="bg-amber-100 text-amber-800 text-[9px] border border-amber-200 shrink-0">
                        Invited
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-700 text-[9px] border border-emerald-200 shrink-0">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-ink-soft font-medium">Assigned Role:</span>
                      <Badge className={cn("capitalize font-bold text-[9px] px-2 py-0.5 border", roleMeta.color)}>
                        {roleMeta.title}
                      </Badge>
                    </div>

                    {m.memberId && (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] text-ink-soft font-medium">Member ID:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(m.memberId);
                            toast.success(`Copied ${m.memberId} to clipboard`);
                          }}
                          title="Click to copy Member ID"
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer"
                        >
                          <span>{m.memberId}</span>
                          <Copy className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      </div>
                    )}

                    <div className="rounded-xl border border-line bg-surface-muted/50 p-2 text-xs space-y-1">
                      <p className="font-medium text-ink flex items-center gap-1.5 truncate">
                        <Briefcase className="h-3.5 w-3.5 text-brand-600 shrink-0" /> {m.jobTitle || "Team Member"}
                      </p>
                      <p className="text-[11px] text-ink-soft flex items-center gap-1.5 truncate">
                        <Building className="h-3.5 w-3.5 text-ink-soft/60 shrink-0" /> {m.department || "Operations"}
                      </p>
                    </div>

                    {/* Custom Overrides indicator */}
                    {Array.isArray(m.customPermissions) && m.customPermissions.length > 0 && (
                      <div className="rounded-lg bg-brand-50/50 border border-brand-200/50 p-1.5 text-[10px] text-brand-800 flex items-center justify-between">
                        <span>Custom Overrides:</span>
                        <strong className="font-mono">{m.customPermissions.length} rules</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  {canManageRoles && !isSelf && !isPendingInvite && (
                    <div className="pt-3 border-t border-line space-y-1.5 mt-2">
                      <div className="flex items-center gap-1.5">
                        {isOwner && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="flex-1 text-[11px]"
                            onClick={() => {
                              setSelectedMember(m);
                              setNewRole(m.role);
                              setEditRoleModalOpen(true);
                            }}
                          >
                            Role
                          </Button>
                        )}

                        <Button
                          size="xs"
                          variant="outline"
                          className="flex-1 text-[11px]"
                          onClick={() => handleOpenPermEditor(m)}
                        >
                          <Sliders className="h-3 w-3 mr-1" /> Overrides
                        </Button>
                      </div>

                      {!isOwnerMember && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            className={cn(
                              "flex-1 text-[11px]",
                              isSuspended ? "text-emerald-700 hover:bg-emerald-50" : "text-amber-700 hover:bg-amber-50"
                            )}
                            onClick={() => handleToggleStatus(m)}
                          >
                            {isSuspended ? (
                              <>
                                <RotateCcw className="h-3 w-3 mr-1" /> Reactivate
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" /> Suspend
                              </>
                            )}
                          </Button>

                          {isOwner && (
                            <Button
                              size="xs"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-50 px-2"
                              onClick={() => handleRemoveMember(m)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4 text-xs">
          <span className="text-ink-soft">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredMembers.length)} of {filteredMembers.length} members
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-ink font-semibold">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
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
              placeholder="e.g. Priya Sharma"
              required
            />
          </Field>

          <Field label="Email Address">
            <Input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="priya@company.com"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Job Title">
              <Input
                value={inviteForm.jobTitle}
                onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
                placeholder="Account Executive"
              />
            </Field>

            <Field label="Department">
              <Input
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                placeholder="Sales"
              />
            </Field>
          </div>

          <Field label="Assign Workspace RBAC Role">
            <Select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <option value="viewer">Viewer (Read-Only)</option>
              <option value="rep">Sales Representative</option>
              <option value="manager">Sales Manager</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Change Role ───────────────────────────────────── */}
      <Dialog
        open={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        title={`Change Role for ${selectedMember?.name}`}
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <Field label="Select New RBAC Role">
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="viewer">Viewer (Read-Only)</option>
              <option value="rep">Sales Representative</option>
              <option value="manager">Sales Manager</option>
              <option value="admin">Administrator</option>
              {isOwner && <option value="owner">Workspace Owner</option>}
            </Select>
          </Field>

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

      {/* ── Modal: Custom Permission Matrix Editor ────────────────── */}
      <Dialog
        open={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        title={`Custom Permission Matrix — ${targetMember?.name}`}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-line bg-surface-muted/50 p-3 text-xs flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">
                Base Role: <span className="capitalize text-brand-700">{targetMember?.role}</span>
              </p>
              <p className="text-[11px] text-ink-soft">
                Custom overrides override base role capabilities. Explicit denies strictly win.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <Check className="h-3 w-3" /> Grant
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <Ban className="h-3 w-3" /> Deny
              </span>
              <span className="flex items-center gap-1 text-ink-soft">Inherited</span>
            </div>
          </div>

          <div className="space-y-5">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.name} className="space-y-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-ink border-b border-line pb-1">
                  {group.name}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.permissions.map((perm) => {
                    const baseHas = (CANONICAL_ROLES_BASE[targetMember?.role] || []).includes(perm.id) || targetMember?.role === "owner";
                    const overrideVal = customOverrides[perm.id]; // true (grant), false (deny), or undefined

                    const isEffectiveGranted = overrideVal === true || (overrideVal === undefined && baseHas);

                    return (
                      <div
                        key={perm.id}
                        className={cn(
                          "rounded-xl border p-2.5 flex items-start justify-between gap-2 text-xs transition",
                          overrideVal === false
                            ? "border-rose-300 bg-rose-50/40"
                            : overrideVal === true
                            ? "border-emerald-300 bg-emerald-50/40"
                            : "border-line bg-surface"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink truncate">{perm.label}</p>
                          <p className="text-[10px] text-ink-soft truncate">{perm.desc}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[9px]">
                            <span className="text-ink-soft">Status:</span>
                            {isEffectiveGranted ? (
                              <span className="text-emerald-700 font-bold">ALLOW</span>
                            ) : (
                              <span className="text-rose-700 font-bold">DENY</span>
                            )}
                            <span className="text-ink-soft/60">
                              ({overrideVal === true ? "Custom Grant" : overrideVal === false ? "Custom Deny" : "Inherited"})
                            </span>
                          </div>
                        </div>

                        {/* Tri-state buttons: Inherit, Grant, Deny */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Inherit from role"
                            onClick={() => {
                              const next = { ...customOverrides };
                              delete next[perm.id];
                              setCustomOverrides(next);
                            }}
                            className={cn(
                              "h-6 px-1.5 rounded text-[10px] border transition",
                              overrideVal === undefined
                                ? "bg-surface border-ink text-ink font-bold shadow-2xs"
                                : "border-line text-ink-soft hover:bg-surface-muted"
                            )}
                          >
                            Default
                          </button>

                          <button
                            type="button"
                            title="Explicit Grant"
                            onClick={() => {
                              setCustomOverrides({ ...customOverrides, [perm.id]: true });
                            }}
                            className={cn(
                              "h-6 px-1.5 rounded text-[10px] border transition",
                              overrideVal === true
                                ? "bg-emerald-600 border-emerald-600 text-white font-bold"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            )}
                          >
                            Grant
                          </button>

                          <button
                            type="button"
                            title="Explicit Deny"
                            onClick={() => {
                              setCustomOverrides({ ...customOverrides, [perm.id]: false });
                            }}
                            className={cn(
                              "h-6 px-1.5 rounded text-[10px] border transition",
                              overrideVal === false
                                ? "bg-rose-600 border-rose-600 text-white font-bold"
                                : "border-rose-200 text-rose-700 hover:bg-rose-50"
                            )}
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setPermModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} loading={submitting}>
              Save Overrides
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Confirmation Dialog ──────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        title={confirmDialog.title}
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
              confirmDialog.variant === "danger" ? "bg-rose-100 text-rose-600" : "bg-brand-100 text-brand-600"
            )}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">{confirmDialog.message}</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
            >
              {confirmDialog.actionLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

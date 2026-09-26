import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Wand2,
  Plus,
  Paperclip,
  Trash2,
  Upload,
  Sparkles,
  AlertCircle,
  Pencil,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  UserCheck,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Avatar,
  Spinner,
  Tabs,
  Field,
  Input,
  Textarea,
  Dialog,
} from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { LeadFormDialog } from "../components/leads/LeadFormDialog";
import { TaskScheduleDialog } from "../components/leads/TaskScheduleDialog";
import { AiEmailDialog } from "../components/ai/AiEmailDialog";
import { leadsApi, notesApi, aiApi } from "../lib/services";
import { currency, shortDate, relative } from "../lib/format";
import { STAGE_STYLES, PRIORITY_STYLES } from "../lib/constants";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // AI states
  const [loadingAi, setLoadingAi] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter tab for activity feed
  const [activityTab, setActivityTab] = useState("all");

  const fetchLeadData = useCallback(async () => {
    try {
      const res = await leadsApi.get(id);
      setLead(res.lead);
    } catch (err) {
      toast.error(err?.message || "Failed to load lead details");
      navigate("/leads");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await leadsApi.getActivity(id);
      setActivity(res.activity || []);
    } catch (err) {
      console.error("Failed to load activity", err);
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
    fetchActivity();
  }, [fetchLeadData, fetchActivity]);

  const handleRunAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const res = await aiApi.leadSummary(id);
      setLead((prev) => ({
        ...prev,
        aiSummary: res.summary,
        aiRiskScore: res.aiRiskScore,
      }));
      toast.success("AI analysis updated!");
    } catch (err) {
      toast.error(err?.message || "AI analysis failed");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      await notesApi.create({
        lead: id,
        content: noteContent.trim(),
      });
      toast.success("Note added!");
      setNoteContent("");
      setNoteOpen(false);
      fetchActivity();
    } catch (err) {
      toast.error(err?.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return toast.error("File size must be less than 10MB");
    }
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await leadsApi.uploadAttachment(id, formData);
      setLead(res.lead);
      toast.success("File attached successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      const res = await leadsApi.deleteAttachment(id, attachmentId);
      setLead(res.lead);
      toast.success("Attachment deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete attachment");
    }
  };

  const handleDeleteLead = async () => {
    setDeleting(true);
    try {
      await leadsApi.remove(id);
      toast.success("Lead deleted successfully");
      navigate("/leads");
    } catch (err) {
      toast.error(err?.message || "Failed to delete lead");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lead) return null;

  const riskScore = lead.aiRiskScore ?? null;
  const riskColor =
    riskScore === null
      ? "text-ink-soft bg-surface-muted"
      : riskScore > 66
      ? "text-rose-600 bg-rose-50 border-rose-200"
      : riskScore > 33
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-emerald-600 bg-emerald-50 border-emerald-200";

  // Filtered activity items
  const filteredActivity = activity.filter((item) => {
    if (activityTab === "all") return true;
    if (activityTab === "notes") return item.type === "note";
    if (activityTab === "emails") return item.type === "email";
    if (activityTab === "tasks") return item.type === "task";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Back button & Page Header */}
      <div>
        <button
          onClick={() => navigate("/leads")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>
        <PageHeader
          title={lead.name}
          subtitle={lead.company ? `${lead.company} · Added ${relative(lead.createdAt)}` : `Added ${relative(lead.createdAt)}`}
        >
          <Button variant="outline" onClick={() => setEmailOpen(true)}>
            <Wand2 className="h-4 w-4 text-brand-600" /> Generate AI Email
          </Button>
          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            <Calendar className="h-4 w-4" /> Schedule Follow-up
          </Button>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </PageHeader>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Deal Value</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{currency(lead.value)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Pipeline Stage</p>
          <div className="mt-1">
            <Badge className={cn("text-xs font-semibold", STAGE_STYLES[lead.status])}>
              {lead.status}
            </Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Priority</p>
          <div className="mt-1">
            <Badge className={cn("text-xs font-semibold", PRIORITY_STYLES[lead.priority])}>
              {lead.priority} Priority
            </Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft">AI Risk Score</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-0.5 text-sm font-bold", riskColor)}>
              {riskScore !== null ? `${riskScore} / 100` : "Not Scored"}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid Layout: Left Details / Right Activity Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Details & AI Intelligence) */}
        <div className="space-y-6 lg:col-span-1">
          {/* AI Intelligence Card */}
          <Card className="overflow-hidden border-brand-200 bg-linear-to-b from-brand-50/50 to-surface p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base font-bold text-ink">AI Intelligence</h3>
              </div>
              <Button size="sm" variant="subtle" onClick={handleRunAiAnalysis} loading={loadingAi}>
                Analyze
              </Button>
            </div>

            {lead.aiSummary ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Executive Briefing</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{lead.aiSummary}</p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Risk Factors Detected</span>
                  </div>
                  <ul className="space-y-1 text-xs text-ink-soft pl-6 list-disc">
                    {riskScore > 50 ? (
                      <>
                        <li>No recent email outreach recorded</li>
                        <li>Deal stagnant in current stage</li>
                      </>
                    ) : (
                      <>
                        <li>High deal momentum</li>
                        <li>Active follow-up timeline</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-soft">
                Click Analyze to generate an AI summary, risk score, and deal recommendations.
              </p>
            )}
          </Card>

          {/* Contact Details Card */}
          <Card className="p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-ink">Contact Details</h3>
            <div className="space-y-3">
              <DetailRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
              <DetailRow icon={Phone} label="Phone" value={lead.phone} href={`tel:${lead.phone}`} />
              <DetailRow icon={Building2} label="Company" value={lead.company} />
              <DetailRow icon={UserCheck} label="Lead Source" value={lead.source || "Website"} />
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium uppercase text-ink-soft mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} className="bg-surface-muted text-ink">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* File Attachments Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink">Attachments</h3>
              <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-soft">
                {lead.attachments?.length || 0}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {lead.attachments?.map((file) => (
                <div key={file._id} className="group flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 transition hover:bg-surface-muted">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <a href={file.url} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-brand-700 hover:underline">
                        {file.name}
                      </a>
                      <p className="text-[10px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAttachment(file._id)}
                    className="hidden rounded p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 group-hover:block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-2.5 text-xs font-medium text-brand-700 transition hover:bg-brand-50">
                {uploading ? <Spinner size="sm" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading..." : "Attach Document"}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column (Chronological Activity Feed) */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Activity Timeline</h3>
                <p className="text-xs text-ink-soft">Unified audit trail of notes, tasks, and communications</p>
              </div>
              <Button size="sm" onClick={() => setNoteOpen(true)}>
                <Plus className="h-4 w-4" /> Add Note
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="mt-4 border-b border-line pb-2">
              <Tabs
                value={activityTab}
                onChange={setActivityTab}
                tabs={[
                  { value: "all", label: "All Activity" },
                  { value: "notes", label: "Notes" },
                  { value: "emails", label: "Emails" },
                  { value: "tasks", label: "Tasks" },
                ]}
              />
            </div>

            {/* Activity Stream */}
            <div className="mt-6">
              {activityLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-soft">
                  No activity recorded yet for this lead.
                </div>
              ) : (
                <div className="relative space-y-6 pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-line">
                  {filteredActivity.map((item) => (
                    <TimelineItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Dialog Modals */}
      <LeadFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={lead}
        onSaved={fetchLeadData}
      />

      <AiEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        lead={lead}
        onSent={fetchActivity}
      />

      <TaskScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        lead={lead}
        onSaved={fetchActivity}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteLead}
        loading={deleting}
        title="Delete Lead?"
        description={`Are you sure you want to delete ${lead.name}? All associated tasks and notes will be removed.`}
        confirmLabel="Delete Lead"
      />

      {/* Add Note Modal */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} title="Add Note to Timeline">
        <form onSubmit={handleAddNote} className="mt-4 space-y-4">
          <Field label="Note Content">
            <Textarea
              rows={4}
              placeholder="Record call outcome, budget notes, or key decisions..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingNote}>
              {savingNote && <Spinner size="sm" />}
              Save Note
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value, href }) {
  if (!value) return null;
  const body = (
    <div className="flex items-center gap-3 text-sm text-ink">
      <Icon className="h-4 w-4 shrink-0 text-ink-soft" />
      <span className="truncate">{value}</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between">
      {href ? (
        <a href={href} className="hover:text-brand-700 hover:underline">
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}

function TimelineItem({ item }) {
  let icon = <Clock className="h-3.5 w-3.5 text-ink-soft" />;
  let iconBg = "bg-surface-muted text-ink-soft";

  if (item.type === "email") {
    icon = <Send className="h-3.5 w-3.5 text-sky-600" />;
    iconBg = "bg-sky-50 text-sky-600";
  } else if (item.type === "note") {
    icon = <FileText className="h-3.5 w-3.5 text-brand-600" />;
    iconBg = "bg-brand-50 text-brand-600";
  } else if (item.type === "task") {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />;
    iconBg = "bg-violet-50 text-violet-600";
  }

  return (
    <div className="relative">
      {/* Icon node */}
      <div className={cn("absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-surface shadow-xs", iconBg)}>
        {icon}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-line bg-surface p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">{item.title}</p>
          <span className="text-[10px] text-ink-soft">{relative(item.timestamp)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-xs text-ink-soft leading-relaxed">
          {item.description}
        </p>
      </div>
    </div>
  );
}

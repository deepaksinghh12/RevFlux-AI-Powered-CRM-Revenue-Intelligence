import { useState } from "react";
import {
  Mail,
  Phone,
  Building2,
  Sparkles,
  Pencil,
  Trash2,
  Wand2,
  AlertCircle,
  Upload,
  Paperclip,
  Calendar,
} from "lucide-react";
import { Drawer, Button, Badge, Avatar, Spinner } from "../ui";
import { AiEmailDialog } from "../ai/AiEmailDialog";
import { TaskScheduleDialog } from "./TaskScheduleDialog";
import { aiApi, leadsApi } from "../../lib/services";
import { currency, shortDate } from "../../lib/format";
import { STAGE_STYLES, PRIORITY_STYLES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

/** Detailed slide-over for a single lead: info, AI summary, email generator. */
export function LeadDrawer({ open, onClose, lead, onEdit, onDelete, onUpdate }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!lead) return null;
  const stage = STAGE_STYLES[lead.status] || STAGE_STYLES.New;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10MB)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await leadsApi.uploadAttachment(lead._id, formData);
      toast.success("File attached!");
      
      if (onUpdate) {
        onUpdate({ ...lead, attachments: [...(lead.attachments || []), res.attachment] });
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await leadsApi.deleteAttachment(lead._id, attachmentId);
      toast.success("Attachment deleted");
      
      if (onUpdate) {
        onUpdate({ ...lead, attachments: lead.attachments.filter(a => a._id !== attachmentId) });
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete attachment");
    }
  };

  const runSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await aiApi.leadSummary({ leadId: lead._id });
      setSummary(res);
    } catch (err) {
      toast.error(err.message || "Could not summarize lead");
    } finally {
      setLoadingSummary(false);
    }
  };

  const riskTone =
    summary?.riskScore >= 66
      ? "text-rose-600"
      : summary?.riskScore >= 33
      ? "text-amber-600"
      : "text-brand-700";

  return (
    <>
      <Drawer open={open} onClose={onClose} title="Lead details">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={stage.badge} dot={stage.dot}>
            {lead.status}
          </Badge>
          <Badge className={PRIORITY_STYLES[lead.priority]}>{lead.priority} priority</Badge>
          <Badge>{lead.source}</Badge>
        </div>

        {lead.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <span key={tag} className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Value */}
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs uppercase tracking-wide text-ink-soft">Deal value</p>
          <p className="mt-1 text-2xl font-bold text-ink">{currency(lead.value)}</p>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          <InfoRow icon={Mail} value={lead.email} href={`mailto:${lead.email}`} />
          <InfoRow icon={Phone} value={lead.phone} href={`tel:${lead.phone}`} />
          <InfoRow icon={Building2} value={lead.company} />
        </div>

        {lead.notes && (
          <div className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Notes
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{lead.notes}</p>
          </div>
        )}

        {/* AI summary */}
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Sparkles className="h-4 w-4" /> AI Lead Summary
            </div>
            {!summary && (
              <Button size="sm" variant="subtle" onClick={runSummary} loading={loadingSummary}>
                Analyze
              </Button>
            )}
          </div>

          {loadingSummary && <Spinner className="p-4" />}

          {summary && (
            <div className="mt-3 space-y-3 animate-fade-up">
              <p className="text-sm leading-relaxed text-ink">{summary.summary}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xs text-ink-soft">Risk score</p>
                  <p className={cn("text-lg font-bold", riskTone)}>
                    {summary.riskScore}
                    <span className="text-sm text-ink-soft">/100</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center">
                  <p className="text-xs text-ink-soft">Suggested priority</p>
                  <p className="text-lg font-bold text-ink">{summary.suggestedPriority}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-surface p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p className="text-sm text-ink">
                  <span className="font-medium">Next best action: </span>
                  {summary.nextBestAction}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
          <p className="flex items-center justify-between text-xs uppercase tracking-wide text-ink-soft">
            <span>Attachments</span>
            <span className="rounded bg-surface-muted px-1.5 py-0.5 text-ink">{lead.attachments?.length || 0}</span>
          </p>
          <div className="mt-3 space-y-2">
            {lead.attachments?.map((file) => (
              <div key={file._id} className="group flex items-center justify-between rounded-lg border border-line bg-surface p-2 transition hover:bg-surface-muted">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <a href={file.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-700 hover:underline">
                      {file.name}
                    </a>
                    <p className="text-[11px] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
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
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm font-medium text-brand-700 transition hover:bg-brand-50">
              {uploading ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload file (PDF, Doc, Img)"}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setEmailOpen(true)} className="col-span-2">
            <Wand2 className="h-4 w-4" /> Generate AI email
          </Button>
          <Button variant="outline" onClick={() => setScheduleOpen(true)} className="col-span-2">
            <Calendar className="h-4 w-4" /> Schedule Follow-up
          </Button>
          <Button variant="secondary" onClick={() => onEdit(lead)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button variant="danger" onClick={() => onDelete(lead)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Added {shortDate(lead.createdAt)}
        </p>
      </Drawer>

      <AiEmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} lead={lead} />
      <TaskScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} lead={lead} />
    </>
  );
}

function InfoRow({ icon: Icon, value, href }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-sm text-ink transition hover:text-brand-700">
      <Icon className="h-4 w-4 text-ink-soft" />
      <span className="truncate">{value}</span>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  );
}

import { useEffect, useState } from "react";
import {
  Mail,
  Sparkles,
  FileText,
  Zap,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Field,
  Select,
  Textarea,
  Spinner,
  Dialog,
} from "../components/ui";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { outreachApi, leadsApi } from "../lib/services";
import { toast } from "sonner";
import { currency } from "../lib/format";

export default function Outreach() {
  const [activeTab, setActiveTab] = useState("templates"); // "templates" | "cadences" | "queue"
  const [templates, setTemplates] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Template Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [tplForm, setTplForm] = useState({
    name: "",
    category: "Follow-up",
    subject: "",
    body: "",
    aiInstruction: "",
  });

  // Sequence Modal State
  const [seqModalOpen, setSeqModalOpen] = useState(false);
  const [seqForm, setSeqForm] = useState({
    name: "",
    triggerType: "stage_change",
    triggerStage: "Proposal",
    riskThreshold: 60,
    templateId: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tplRes, seqRes, qRes] = await Promise.all([
        outreachApi.getTemplates(),
        outreachApi.getSequences(),
        outreachApi.getQueue(),
      ]);
      setTemplates(tplRes?.templates || []);
      setSequences(seqRes?.sequences || []);
      setQueue(qRes?.queue || []);
    } catch (err) {
      toast.error("Failed to load outreach dataset");
    } finally {
      setLoading(false);
    }
  };

  /* ── Template CRUD Handlers ───────────────────────────────────── */
  const handleOpenTplModal = (tpl = null) => {
    if (tpl) {
      setEditingTemplate(tpl);
      setTplForm({
        name: tpl.name,
        category: tpl.category,
        subject: tpl.subject,
        body: tpl.body,
        aiInstruction: tpl.aiInstruction || "",
      });
    } else {
      setEditingTemplate(null);
      setTplForm({
        name: "",
        category: "Follow-up",
        subject: "",
        body: "",
        aiInstruction: "",
      });
    }
    setModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTemplate) {
        await outreachApi.updateTemplate(editingTemplate._id, tplForm);
        toast.success("Template updated successfully!");
      } else {
        await outreachApi.createTemplate(tplForm);
        toast.success("New email template created!");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.message || "Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await outreachApi.deleteTemplate(id);
      toast.success("Template deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  /* ── Sequence Handlers ────────────────────────────────────────── */
  const handleToggleSequence = async (id) => {
    try {
      const res = await outreachApi.toggleSequence(id);
      toast.success(`Cadence ${res.sequence.isActive ? "activated" : "paused"}`);
      loadData();
    } catch (err) {
      toast.error("Failed to toggle cadence");
    }
  };

  const handleSaveSequence = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await outreachApi.createSequence(seqForm);
      toast.success("New automated cadence rule created!");
      setSeqModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.message || "Failed to create cadence");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Queue Action Handlers ───────────────────────────────────── */
  const handleSendQueueDraft = async (item) => {
    try {
      // Execute email send via lead API
      if (item.lead?._id) {
        await leadsApi.sendEmail(item.lead._id, { subject: item.subject, body: item.body });
      }
      await outreachApi.sendQueueItem(item._id);
      toast.success(`Outreach email sent to ${item.lead?.name || "lead"}!`);
      loadData();
    } catch (err) {
      toast.error(err?.message || "Failed to send email draft");
    }
  };

  const handleDismissQueueDraft = async (id) => {
    try {
      await outreachApi.dismissQueueItem(id);
      toast.success("Draft dismissed from queue");
      loadData();
    } catch (err) {
      toast.error("Failed to dismiss draft");
    }
  };

  const filteredTemplates = templates.filter(
    (t) => categoryFilter === "All" || t.category === categoryFilter
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="AI Email Outreach & Sequences"
        subtitle="Manage pre-saved email templates, configure automated drip cadences, and review AI-generated lead drafts."
      />

      {/* Top Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition ${
              activeTab === "templates"
                ? "bg-brand-600 text-white shadow-xs"
                : "bg-surface text-ink-soft hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <FileText className="h-4 w-4" /> AI Email Templates ({templates.length})
          </button>

          <button
            onClick={() => setActiveTab("cadences")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition ${
              activeTab === "cadences"
                ? "bg-brand-600 text-white shadow-xs"
                : "bg-surface text-ink-soft hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <Zap className="h-4 w-4" /> Automated Cadences ({sequences.length})
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition ${
              activeTab === "queue"
                ? "bg-brand-600 text-white shadow-xs"
                : "bg-surface text-ink-soft hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <Mail className="h-4 w-4" /> Draft Queue
            {queue.filter((q) => q.status === "pending_review").length > 0 && (
              <Badge className="bg-amber-400 text-amber-950 font-bold text-[10px] ml-1">
                {queue.filter((q) => q.status === "pending_review").length}
              </Badge>
            )}
          </button>
        </div>

        {activeTab === "templates" && (
          <Button onClick={() => handleOpenTplModal()}>
            <Plus className="h-4 w-4 mr-1" /> Create Template
          </Button>
        )}

        {activeTab === "cadences" && (
          <Button onClick={() => setSeqModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Cadence Rule
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" className="mx-auto text-brand-600 mb-3" />
          <p className="text-xs text-ink-soft">Loading email templates & automated cadences…</p>
        </div>
      ) : (
        <>
          {/* ── TAB 1: TEMPLATE LIBRARY ───────────────────────────── */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {["All", "Cold Outreach", "Follow-up", "Proposal", "Re-engagement", "Closing"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      categoryFilter === cat
                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                        : "bg-surface text-ink-soft border border-line hover:border-brand-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredTemplates.length === 0 ? (
                <EmptyState
                  title="No Templates Found"
                  description="Create custom AI email templates or reset filter categories."
                  actionLabel="Create Template"
                  onAction={() => handleOpenTplModal()}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {filteredTemplates.map((tpl) => (
                    <Card key={tpl._id} className="shadow-xs hover:border-brand-300 transition flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge className="bg-brand-50 text-brand-700 font-bold uppercase text-[9px] mb-1.5">
                              {tpl.category}
                            </Badge>
                            <CardTitle className="text-base font-bold text-ink">{tpl.name}</CardTitle>
                          </div>
                          {tpl.isDefault && (
                            <Badge className="bg-slate-100 text-slate-700 text-[10px]">Default</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="rounded-xl border border-line bg-surface-muted/50 p-2.5 text-xs">
                            <span className="font-semibold text-ink-soft">Subject Pattern: </span>
                            <span className="font-medium text-ink">{tpl.subject}</span>
                          </div>

                          <div className="rounded-xl border border-line bg-surface p-3 text-xs text-ink-soft font-mono line-clamp-4 leading-relaxed whitespace-pre-wrap">
                            {tpl.body}
                          </div>

                          {tpl.aiInstruction && (
                            <p className="text-[11px] text-brand-700 flex items-center gap-1.5 font-medium">
                              <Sparkles className="h-3 w-3 text-brand-600" /> Guidance: {tpl.aiInstruction}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-line mt-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`Subject: ${tpl.subject}\n\n${tpl.body}`);
                              toast.success("Template text copied!");
                            }}
                            className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink font-semibold"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy Pattern
                          </button>
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="ghost" onClick={() => handleOpenTplModal(tpl)}>
                              Edit
                            </Button>
                            {!tpl.isDefault && (
                              <Button
                                size="xs"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteTemplate(tpl._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: AUTOMATED CADENCES ─────────────────────────── */}
          {activeTab === "cadences" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-200/60 bg-brand-50/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-ink flex items-center gap-2">
                    <Zap className="h-4 w-4 text-brand-600" /> Automated Lead Drip Engine Active
                  </p>
                  <p className="text-ink-soft">
                    When leads change pipeline stages or cross AI risk thresholds, RevFlux automatically generates customized outreach email drafts in your draft queue.
                  </p>
                </div>
                <Button size="sm" onClick={() => setSeqModalOpen(true)}>
                  + Add Cadence Trigger
                </Button>
              </div>

              {sequences.length === 0 ? (
                <EmptyState
                  title="No Cadences Configured"
                  description="Create your first automated email drip trigger rule."
                  actionLabel="Add Cadence Rule"
                  onAction={() => setSeqModalOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sequences.map((seq) => (
                    <Card key={seq._id} className="shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl border ${seq.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                              <Zap className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base font-bold text-ink">{seq.name}</CardTitle>
                              <CardDescription>
                                Trigger: {seq.triggerType === "stage_change" ? `Stage = ${seq.triggerStage}` : seq.triggerType === "at_risk" ? `AI Risk Score ≥ ${seq.riskThreshold}` : "New Lead Created"}
                              </CardDescription>
                            </div>
                          </div>

                          <Button
                            size="xs"
                            variant={seq.isActive ? "outline" : "secondary"}
                            onClick={() => handleToggleSequence(seq._id)}
                          >
                            {seq.isActive ? <Pause className="h-3 w-3 mr-1 text-emerald-600" /> : <Play className="h-3 w-3 mr-1 text-slate-500" />}
                            {seq.isActive ? "Active" : "Paused"}
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 space-y-3">
                        <div className="rounded-xl border border-line bg-surface-muted/50 p-3 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Linked Template:</span>
                            <span className="font-bold text-ink">{seq.template?.name || "Default Template"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Total Executions:</span>
                            <span className="font-semibold text-brand-700">{seq.executionsCount || 0} Drafts Generated</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: DRAFT QUEUE ───────────────────────────────── */}
          {activeTab === "queue" && (
            <div className="space-y-4">
              {queue.length === 0 ? (
                <EmptyState
                  title="Draft Queue Clear"
                  description="No pending email drafts awaiting approval. Cadences automatically generate drafts when triggers fire."
                />
              ) : (
                <div className="space-y-4">
                  {queue.map((item) => {
                    const isPending = item.status === "pending_review";
                    return (
                      <Card key={item._id} className={`shadow-xs border ${isPending ? "border-brand-200" : "border-line opacity-80"}`}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold border border-brand-200/50">
                                <Mail className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-ink text-sm">{item.lead?.name || "Unassigned Lead"}</h4>
                                  <span className="text-xs text-ink-soft">({item.lead?.company || "Company"})</span>
                                  {item.lead?.value > 0 && (
                                    <Badge className="bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                      {currency(item.lead.value)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-ink-soft mt-0.5 flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-brand-600" /> Trigger: {item.triggerReason}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPending ? (
                                <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                                  Pending Review
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                                  Sent {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2 rounded-2xl border border-line bg-surface p-3.5 text-xs">
                            <div className="flex justify-between font-bold text-ink border-b border-line pb-2">
                              <span>Subject: {item.subject}</span>
                              <span className="text-[11px] text-ink-soft font-normal">{item.lead?.email}</span>
                            </div>
                            <p className="text-ink-soft leading-relaxed whitespace-pre-wrap pt-1 font-mono text-[11px]">
                              {item.body}
                            </p>
                          </div>

                          {isPending && (
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDismissQueueDraft(item._id)}
                              >
                                Dismiss Draft
                              </Button>
                              <Button size="sm" onClick={() => handleSendQueueDraft(item)}>
                                <Send className="h-3.5 w-3.5 mr-1" /> Approve & Send Email
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modal: Template Create/Edit ───────────────────────────── */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTemplate ? "Edit Email Template" : "Create AI Email Template"}
        className="max-w-xl"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
          <Field label="Template Title">
            <Input
              value={tplForm.name}
              onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
              placeholder="e.g. Executive Proposal Follow-up"
              required
            />
          </Field>

          <Field label="Category">
            <Select
              value={tplForm.category}
              onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })}
            >
              {["Cold Outreach", "Follow-up", "Proposal", "Re-engagement", "Closing"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>

          <Field label="Subject Pattern (supports {{leadName}}, {{company}}, {{repName}})">
            <Input
              value={tplForm.subject}
              onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })}
              placeholder="Following up on {{company}}'s proposal"
              required
            />
          </Field>

          <Field label="Email Body Template">
            <Textarea
              rows={6}
              value={tplForm.body}
              onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })}
              placeholder="Hi {{leadName}},\n\nI noticed {{company}} is evaluating revenue tools..."
              required
            />
          </Field>

          <Field label="AI Guidance Prompt (Optional)">
            <Input
              value={tplForm.aiInstruction}
              onChange={(e) => setTplForm({ ...tplForm, aiInstruction: e.target.value })}
              placeholder="Keep tone empathetic, focus on ROI and speed"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Template
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Sequence Create ────────────────────────────────── */}
      <Dialog
        open={seqModalOpen}
        onClose={() => setSeqModalOpen(false)}
        title="Create Automated Cadence Trigger"
        className="max-w-md"
      >
        <form onSubmit={handleSaveSequence} className="space-y-4 pt-2">
          <Field label="Cadence Name">
            <Input
              value={seqForm.name}
              onChange={(e) => setSeqForm({ ...seqForm, name: e.target.value })}
              placeholder="e.g. Proposal Stage Follow-up Trigger"
              required
            />
          </Field>

          <Field label="Trigger Condition">
            <Select
              value={seqForm.triggerType}
              onChange={(e) => setSeqForm({ ...seqForm, triggerType: e.target.value })}
            >
              <option value="stage_change">Lead Stage Transitions</option>
              <option value="at_risk">AI Deal Risk Threshold Spike</option>
              <option value="new_lead">New Lead Created</option>
            </Select>
          </Field>

          {seqForm.triggerType === "stage_change" && (
            <Field label="Target Pipeline Stage">
              <Select
                value={seqForm.triggerStage}
                onChange={(e) => setSeqForm({ ...seqForm, triggerStage: e.target.value })}
              >
                {["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation"].map((stg) => (
                  <option key={stg}>{stg}</option>
                ))}
              </Select>
            </Field>
          )}

          {seqForm.triggerType === "at_risk" && (
            <Field label="Risk Score Threshold (0-100)">
              <Input
                type="number"
                value={seqForm.riskThreshold}
                onChange={(e) => setSeqForm({ ...seqForm, riskThreshold: Number(e.target.value) })}
                min={10}
                max={100}
              />
            </Field>
          )}

          <Field label="Attach Email Template">
            <Select
              value={seqForm.templateId}
              onChange={(e) => setSeqForm({ ...seqForm, templateId: e.target.value })}
            >
              <option value="">Select Template…</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={() => setSeqModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Cadence
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Wand2,
  Clock,
  Send,
  Sparkles,
  AlertTriangle,
  FileText
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Avatar,
  Spinner,
} from "../components/ui";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { TaskScheduleDialog } from "../components/leads/TaskScheduleDialog";
import { AiEmailDialog } from "../components/ai/AiEmailDialog";
import { leadsApi, aiApi } from "../lib/services";
import { currency, shortDate, relative } from "../lib/format";
import { STAGE_STYLES } from "../lib/constants";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await leadsApi.get(id);
      setLead(res.lead);
      setActivity(res.activity || []);
    } catch (err) {
      toast.error("Failed to load lead details");
      navigate("/leads");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lead) return null;

  const riskScore = lead.aiRiskScore ?? null;
  const isHighRisk = riskScore > 75;
  const isMediumRisk = riskScore > 50;

  const [aiLoading, setAiLoading] = useState(false);

  const handleReevaluateRisk = async () => {
    setAiLoading(true);
    try {
      await aiApi.leadSummary({ leadId: lead._id, force: true });
      toast.success("AI Risk Score re-evaluated successfully!");
      fetchLead();
    } catch (err) {
      toast.error(err.message || "Failed to re-evaluate AI risk");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/pipeline")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pipeline
        </button>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={lead.name} size="xl" className="h-16 w-16 text-lg border-2 border-surface shadow-sm" />
            <div>
              <h1 className="text-2xl font-display font-bold text-ink">{lead.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                {lead.company && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" /> {lead.company}
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> {lead.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Badge className={cn("text-[10px]", STAGE_STYLES[lead.status]?.badge || "bg-sky-50 text-sky-700")}>
                    {lead.status}
                  </Badge>
                </span>
                <span className="font-mono font-semibold text-ink">{currency(lead.value)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={() => setEmailOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Draft AI Email
            </Button>
            <Button variant="primary" onClick={() => setScheduleOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" /> Schedule Task
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-ink mb-6">Activity Timeline</h3>
            {activity.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-line rounded-xl">
                <Clock className="h-8 w-8 text-ink-soft mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-ink">No activity yet</p>
                <p className="text-xs text-ink-soft mt-1">Schedule a task or draft an email to get started.</p>
              </div>
            ) : (
              <div className="relative pl-4 border-l border-line/60 space-y-8">
                {activity.map((item, idx) => (
                  <TimelineItem key={idx} item={item} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: AI Intel & Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Intelligence Card */}
          <Card className={cn(
            "p-6 transition-all",
            isHighRisk ? "bg-rose-50/50 border-rose-200" : isMediumRisk ? "bg-amber-50/50 border-amber-200" : "bg-surface"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                  isHighRisk ? "bg-rose-500 text-white" : isMediumRisk ? "bg-amber-500 text-white" : "bg-brand-600 text-white"
                )}>
                  {riskScore !== null ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <h3 className="font-bold text-ink">AI Intelligence</h3>
              </div>
              <button
                onClick={handleReevaluateRisk}
                disabled={aiLoading}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Wand2 className={cn("h-3.5 w-3.5", aiLoading && "animate-spin")} />
                {aiLoading ? "Scoring..." : "Re-score"}
              </button>
            </div>
            
            {riskScore !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Risk Score</span>
                  <span className={cn(
                    "font-display text-xl font-bold",
                    isHighRisk ? "text-rose-600" : isMediumRisk ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {riskScore}/100
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Reason</span>
                  <p className="text-sm text-ink leading-relaxed">{lead.attentionReason || "This lead is currently on track."}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">No AI risk score generated yet for this lead.</p>
            )}
          </Card>

          {/* Details Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-ink mb-4">Deal Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-ink-soft mb-1">Owner</p>
                <div className="flex items-center gap-2">
                  <Avatar name={lead.owner?.name || "Unassigned"} size="xs" />
                  <span className="text-sm font-medium text-ink">{lead.owner?.name || "Unassigned"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-soft mb-1">Priority</p>
                <Badge className="bg-surface border-line text-ink">{lead.priority}</Badge>
              </div>
              <div>
                <p className="text-xs text-ink-soft mb-1">Created</p>
                <p className="text-sm font-medium text-ink">{shortDate(lead.createdAt)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AiEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        lead={lead}
        onSent={fetchLead}
      />
      <TaskScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        lead={lead}
        onSaved={fetchLead}
      />
    </div>
  );
}

function TimelineItem({ item }) {
  let icon = <Clock className="h-4 w-4 text-ink-soft" />;
  let iconBg = "bg-surface border-line text-ink-soft";

  if (item.type === "email") {
    icon = <Send className="h-4 w-4 text-brand-600" />;
    iconBg = "bg-brand-50 border-brand-200 text-brand-600";
  } else if (item.type === "note") {
    icon = <FileText className="h-4 w-4 text-sky-600" />;
    iconBg = "bg-sky-50 border-sky-200 text-sky-600";
  }

  return (
    <div className="relative">
      <div className={cn("absolute -left-8 top-0 flex h-8 w-8 items-center justify-center rounded-full border shadow-xs", iconBg)}>
        {icon}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all hover:shadow-[var(--shadow-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
          <p className="text-sm font-bold text-ink">{item.title}</p>
          <span className="text-xs font-semibold text-ink-soft">{relative(item.timestamp)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-ink-soft leading-relaxed">
          {item.description}
        </p>
      </div>
    </div>
  );
}

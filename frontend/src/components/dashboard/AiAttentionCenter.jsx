import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  AlertTriangle,
  Mail,
  Calendar,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, Button, Badge, Spinner } from "../ui";
import { aiApi } from "../../lib/services";
import { currency } from "../../lib/format";
import { STAGE_STYLES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { AiEmailDialog } from "../ai/AiEmailDialog";
import { TaskScheduleDialog } from "../leads/TaskScheduleDialog";

export function AiAttentionCenter() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Collapse / Expand toggle state
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("revflux_attention_collapsed") === "true";
  });

  // Selected lead for modal action triggers
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("revflux_attention_collapsed", String(next));
  };

  const fetchAttentionLeads = async () => {
    setLoading(true);
    try {
      const res = await aiApi.getAttention();
      setLeads(res.leads || []);
    } catch (err) {
      console.error("Failed to fetch AI Attention leads", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttentionLeads();
  }, []);

  const handleOpenEmail = (lead) => {
    setSelectedLead(lead);
    setEmailOpen(true);
  };

  const handleOpenSchedule = (lead) => {
    setSelectedLead(lead);
    setScheduleOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden border-rose-200/80 bg-linear-to-b from-rose-50/30 via-surface to-surface p-5 shadow-[var(--shadow-card)] transition-all">
        {/* Header Bar */}
        <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", !collapsed && "border-b border-line/60 pb-4")}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-ink">AI Attention Center</h3>
                {leads.length > 0 && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    {leads.length} Need Action
                  </span>
                )}
              </div>
              {collapsed && (
                <p className="text-xs text-ink-soft">
                  {leads.length > 0 ? `${leads.length} high-risk deals require attention` : "All deals on track"}
                </p>
              )}
              {!collapsed && (
                <p className="text-xs text-ink-soft">
                  Automated risk detection — high-value leads slipping through the pipeline
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!collapsed && (
              <Button size="sm" variant="ghost" onClick={fetchAttentionLeads} disabled={loading}>
                Refresh
              </Button>
            )}
            <Button size="sm" variant="subtle" onClick={toggleCollapsed} className="gap-1.5">
              {collapsed ? (
                <>
                  <span>Expand AI Attention</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Hide Section</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Body */}
        {!collapsed && (
          <div className="mt-4 animate-fade-up">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : leads.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-center text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Great job! No high-risk or stagnant leads in your pipeline right now.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {leads.map((lead) => (
                  <AttentionLeadCard
                    key={lead._id}
                    lead={lead}
                    onEmail={() => handleOpenEmail(lead)}
                    onSchedule={() => handleOpenSchedule(lead)}
                    onView={() => navigate(`/leads/${lead._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Action Modals */}
      {selectedLead && (
        <>
          <AiEmailDialog
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
            lead={selectedLead}
            onSent={fetchAttentionLeads}
          />
          <TaskScheduleDialog
            open={scheduleOpen}
            onClose={() => setScheduleOpen(false)}
            lead={selectedLead}
            onSaved={fetchAttentionLeads}
          />
        </>
      )}
    </>
  );
}

function AttentionLeadCard({ lead, onEmail, onSchedule, onView }) {
  const riskBadgeColor =
    lead.riskScore > 75
      ? "bg-rose-100 text-rose-700 border-rose-300"
      : lead.riskScore > 50
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-sky-100 text-sky-700 border-sky-300";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 transition-all hover:shadow-md">
      <div>
        {/* Top Header: Lead Name + Risk Score */}
        <div className="flex items-start justify-between">
          <div>
            <h4
              onClick={onView}
              className="cursor-pointer font-display text-base font-bold text-ink hover:text-brand-600 hover:underline"
            >
              {lead.name}
            </h4>
            <p className="text-xs text-ink-soft">{lead.company || lead.email}</p>
          </div>
          <span className={cn("inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-bold shadow-2xs", riskBadgeColor)}>
            Risk {lead.riskScore}/100
          </span>
        </div>

        {/* Stage & Value Pill */}
        <div className="mt-3 flex items-center gap-2">
          <Badge className={cn("text-[10px]", STAGE_STYLES[lead.status]?.badge || "bg-sky-50 text-sky-700")}>
            {lead.status}
          </Badge>
          <span className="font-mono text-xs font-semibold text-ink">{currency(lead.value)}</span>
        </div>

        {/* Risk Reasons */}
        <div className="mt-3 space-y-1 rounded-xl bg-surface-muted/60 p-2.5">
          <p className="text-[11px] font-semibold text-rose-700">Why Attention Needed:</p>
          {lead.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-xs text-ink-soft">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              <span>{reason}</span>
            </div>
          ))}
        </div>

        {/* Recommended Action */}
        <div className="mt-3 text-xs text-ink">
          <span className="font-semibold text-brand-700">Recommended Action: </span>
          <span className="text-ink-soft">{lead.recommendedAction}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-between gap-1.5 border-t border-line/60 pt-3">
        <Button size="xs" variant="outline" onClick={onEmail}>
          <Mail className="h-3 w-3 text-sky-600" /> Email
        </Button>
        <Button size="xs" variant="outline" onClick={onSchedule}>
          <Calendar className="h-3 w-3 text-violet-600" /> Task
        </Button>
        <Button size="xs" variant="subtle" onClick={onView}>
          <Eye className="h-3 w-3" /> View
        </Button>
      </div>
    </div>
  );
}

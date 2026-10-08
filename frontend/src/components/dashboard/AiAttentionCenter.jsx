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

  // Selected lead for modal action triggers
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Collapse / Expand toggle state (defaults to false/expanded)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("revflux_attention_collapsed") === "true";
  });

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
                  <span>Expand</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Hide</span>
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
              <div className="flex flex-col gap-3">
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
  const isHighRisk = lead.riskScore > 75;
  const isMediumRisk = lead.riskScore > 50;
  
  const riskColor = isHighRisk 
    ? "bg-rose-50 text-rose-700 border-rose-200" 
    : isMediumRisk 
    ? "bg-amber-50 text-amber-700 border-amber-200" 
    : "bg-surface-muted text-ink-soft border-line";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-line bg-canvas p-3 transition-all hover:border-brand-200 hover:shadow-[var(--shadow-soft)] group">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className={cn("hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-bold text-xs", riskColor)}>
          {lead.riskScore}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 
              onClick={onView}
              className="truncate cursor-pointer font-bold text-sm text-ink hover:text-brand-600 transition"
            >
              {lead.name} <span className="font-normal text-ink-soft ml-1">at {lead.company || lead.email}</span>
            </h4>
            <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-line" />
            <span className="hidden sm:inline-block text-xs font-semibold text-ink">{currency(lead.value)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
            <AlertTriangle className={cn("h-3.5 w-3.5", isHighRisk ? "text-rose-500" : isMediumRisk ? "text-amber-500" : "text-ink-soft")} />
            <span className="truncate">{lead.attentionReason || "Stalled in pipeline, needs follow up"}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onSchedule} className="h-8 text-xs font-semibold px-3 hidden group-hover:flex">
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-ink-soft" /> Schedule
        </Button>
        <Button variant="subtle" size="sm" onClick={onEmail} className="h-8 text-xs font-semibold px-3">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Draft Email
        </Button>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  Trophy,
  CalendarClock,
  Sparkles,
  Users,
  Building,
  ShieldCheck,
  UserCheck,
  Briefcase,
  AlertCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { AiAttentionCenter } from "../components/dashboard/AiAttentionCenter";
import { PipelineTrendChart } from "../components/analytics/PipelineTrendChart";
import { ConversionFunnelChart } from "../components/analytics/ConversionFunnelChart";
import {
  Card,
  Badge,
  Skeleton,
  Avatar,
  Button
} from "../components/ui";
import { DashboardSkeleton } from "../components/skeletons";
import { analyticsApi, tasksApi, teamApi } from "../lib/services";
import { currency, shortDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { usePermission } from "../hooks/usePermission";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const { user, activeOrg } = useAuth();
  const { role, hasPermission } = usePermission();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const canReadReports = hasPermission("reports.read") || role === "owner";
  const canReadTeam = hasPermission("team.read") || role === "owner";

  useEffect(() => {
    async function load() {
      try {
        const promises = [tasksApi.list()];
        if (canReadReports) {
          promises.push(analyticsApi.overview().catch(() => ({})));
        }
        if (["owner", "admin", "manager"].includes(role) && canReadTeam) {
          promises.push(teamApi.getMembers().catch(() => ({ members: [] })));
        }

        const [tasksRes, overviewRes, teamRes] = await Promise.all(promises);
        setTasks(tasksRes?.tasks || []);
        if (overviewRes) setStats(overviewRes);
        if (teamRes?.members) setTeamMembers(teamRes.members);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [role, canReadReports, canReadTeam]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const pipelineValue = stats.pipelineValue || 0;
  const wonValue = stats.byStage?.Won?.value || 0;
  const activeLeads = stats.totalLeads ? (stats.totalLeads - (stats.byStage?.Won?.count || 0) - (stats.byStage?.Lost?.count || 0)) : 0;
  const winRate = stats.conversionRate || 0;

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await tasksApi.update(taskId, { status: nextStatus });
      const updatedRes = await tasksApi.list();
      setTasks(updatedRes.tasks || []);
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case "owner":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 uppercase text-[10px]">Workspace Owner</Badge>;
      case "admin":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px]">Operations Admin</Badge>;
      case "manager":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px]">Sales Manager</Badge>;
      case "viewer":
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200 uppercase text-[10px]">Read-Only Viewer</Badge>;
      default:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px]">Sales Representative</Badge>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-ink">
              Good morning, {user.name.split(" ")[0]}
            </h1>
            {getRoleBadge()}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {role === "owner" && "Complete executive overview of workspace revenue, pipeline growth, and operations."}
            {role === "admin" && "Team operations, data pipelines, invitations, and active sequence monitors."}
            {role === "manager" && "Team pipeline distribution, deal progress, risk indicators, and task follow-ups."}
            {role === "rep" && "Your assigned deals, scheduled activities, and customer follow-up actions."}
            {role === "viewer" && "Read-only workspace pipeline summary and team reports."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-surface border border-line text-ink-soft">
            Workspace: {activeOrg?.name}
            {activeOrg?.memberId && (
              <span className="ml-1.5 pl-1.5 border-l border-line font-mono font-bold text-brand-600">
                {activeOrg.memberId}
              </span>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/chat")}>
            <MessageSquare className="h-4 w-4 mr-2 text-brand-600" /> Team Chat
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-copilot'))}>
            <Sparkles className="h-4 w-4 mr-2 text-brand-600" /> Ask Copilot
          </Button>
        </div>
      </div>

      {/* Role-Specific Metric Strip */}
      {canReadReports ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">
              {role === "rep" ? "My Open Pipeline" : "Open Pipeline"}
            </p>
            <p className="font-display text-2xl font-bold text-ink transition">{currency(pipelineValue, { compact: true })}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">
              {role === "rep" ? "My Revenue Won" : "Revenue Won"}
            </p>
            <p className="font-display text-2xl font-bold text-brand-600 transition">{currency(wonValue, { compact: true })}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">
              {role === "rep" ? "My Active Deals" : "Active Deals"}
            </p>
            <p className="font-display text-2xl font-bold text-ink transition">{activeLeads}</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">
              {role === "rep" ? "My Win Rate" : "Win Rate"}
            </p>
            <p className="font-display text-2xl font-bold text-ink transition">{winRate}%</p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-5 flex flex-col justify-center">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Pending Follow-ups</p>
            <p className="font-display text-2xl font-bold text-ink">{tasks.filter(t => t.status !== "Completed").length} Tasks</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Completed Today</p>
            <p className="font-display text-2xl font-bold text-brand-600">{tasks.filter(t => t.status === "Completed").length} Done</p>
          </Card>
          <Card className="p-5 flex flex-col justify-center col-span-2 sm:col-span-1">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Account Role</p>
            <p className="font-display text-lg font-bold text-ink capitalize">{role} Member</p>
          </Card>
        </div>
      )}

      {/* Role-Specific Shortcuts for Owner & Admin */}
      {["owner", "admin"].includes(role) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 flex items-center justify-between border-brand-200/60 bg-brand-50/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-ink">Team Administration</p>
                <p className="text-[11px] text-ink-soft">{teamMembers.length} active workspace members</p>
              </div>
            </div>
            <Button size="xs" variant="outline" onClick={() => navigate("/team")}>
              Manage
            </Button>
          </Card>

          <Card className="p-4 flex items-center justify-between border-line bg-surface">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-ink">Security Audit Logs</p>
                <p className="text-[11px] text-ink-soft">Inspect live system mutations</p>
              </div>
            </div>
            <Button size="xs" variant="outline" onClick={() => navigate("/settings")}>
              View Logs
            </Button>
          </Card>

          <Card className="p-4 flex items-center justify-between border-line bg-surface">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-ink">Lead Reassignment</p>
                <p className="text-[11px] text-ink-soft">Allocate leads across representatives</p>
              </div>
            </div>
            <Button size="xs" variant="outline" onClick={() => navigate("/leads")}>
              Leads
            </Button>
          </Card>
        </div>
      )}

      {/* Main Content Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Attention & Tasks) */}
        <div className={cn("space-y-6", canReadReports ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12")}>
          <AiAttentionCenter />
          
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-ink">
                  {role === "rep" ? "My Tasks & Action Items" : "Today's Action Items"}
                </h3>
                <p className="text-xs text-ink-soft">Follow-ups scheduled for today</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-brand-600">
                View All
              </Button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-line rounded-xl bg-canvas">
                <CheckCircle2 className="mx-auto h-8 w-8 text-brand-300 mb-3" />
                <p className="text-sm font-semibold text-ink">All caught up!</p>
                <p className="text-xs text-ink-soft mt-1">No pending tasks for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map(task => (
                  <div key={task._id} className="flex items-start gap-3 p-3 rounded-xl border border-line/60 bg-canvas transition hover:border-line group">
                    <button
                      onClick={() => handleToggleTask(task._id, task.status)}
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        task.status === "Completed"
                          ? "bg-brand-600 border-brand-600 text-white"
                          : "border-line bg-surface text-transparent hover:border-brand-400 hover:text-brand-500"
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium transition", task.status === "Completed" ? "line-through text-ink-soft" : "text-ink")}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-surface text-ink-soft text-[10px]">{shortDate(task.dueDate)}</Badge>
                        {task.relatedLead && (
                          <span className="text-[11px] text-ink-soft truncate flex items-center gap-1">
                            <span className="h-1 w-1 bg-brand-400 rounded-full" />
                            {task.relatedLead.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (Charts, only rendered if user has reports.read permission) */}
        {canReadReports && (
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <PipelineTrendChart />
            <ConversionFunnelChart data={stats.byStage} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  CheckCircle2,
  Trophy,
  CalendarClock,
  Sparkles,
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
import { analyticsApi, tasksApi } from "../lib/services";
import { currency, shortDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const { user, activeOrg } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [overviewRes, tasksRes] = await Promise.all([
          analyticsApi.overview(),
          tasksApi.list()
        ]);
        setStats(overviewRes);
        setTasks(tasksRes.tasks || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-5 lg:col-span-4">
            <Skeleton className="h-[340px] rounded-2xl" />
            <Skeleton className="h-[340px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const pipelineValue = stats.pipelineValue || 0;
  const wonValue = stats.byStage?.Won?.value || 0;
  const activeLeads = stats.totalLeads - (stats.byStage?.Won?.count || 0) - (stats.byStage?.Lost?.count || 0) || 0;
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">
            Good morning, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Here's what's happening in <span className="font-semibold text-ink">{activeOrg?.name}</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-surface border border-line text-ink-soft">Last 30 Days</Badge>
          <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-copilot'))}>
            <Sparkles className="h-4 w-4 mr-2 text-brand-600" /> Ask Copilot
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">Open Pipeline</p>
          <p className="font-display text-2xl font-bold text-ink transition">{currency(pipelineValue, { compact: true })}</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">Revenue Won</p>
          <p className="font-display text-2xl font-bold text-brand-600 transition">{currency(wonValue, { compact: true })}</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">Active Deals</p>
          <p className="font-display text-2xl font-bold text-ink transition">{activeLeads}</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center transition hover:border-brand-200 group">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1 group-hover:text-brand-600 transition">Win Rate</p>
          <p className="font-display text-2xl font-bold text-ink transition">{winRate}%</p>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Attention & Tasks) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <AiAttentionCenter />
          
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-ink">Today's Tasks</h3>
                <p className="text-xs text-ink-soft">Your immediate action items</p>
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

        {/* Right Column (Charts) */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <PipelineTrendChart />
          <ConversionFunnelChart data={stats.byStage} />
        </div>
      </div>
    </div>
  );
}

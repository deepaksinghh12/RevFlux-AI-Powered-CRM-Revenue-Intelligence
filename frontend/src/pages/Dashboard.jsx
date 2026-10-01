import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  CalendarRange,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Target,
  Layers,
  PieChart as PieIcon,
  CalendarClock,
  Trophy,
  Clock,
  AlertTriangle,
  Building2,
  Newspaper,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  Line,
} from "recharts";
import { format, isPast } from "date-fns";
import { HeroCard } from "../components/dashboard/HeroCard";
import { AiInsightsCard } from "../components/ai/AiInsightsCard";
import { AiAttentionCenter } from "../components/dashboard/AiAttentionCenter";
import {
  Card,
  SectionHeading,
  Badge,
  Tabs,
  Skeleton,
  Avatar,
} from "../components/ui";
import { analyticsApi, contactsApi, leadsApi, tasksApi, notesApi } from "../lib/services";
import { currency, shortDate, timeOf } from "../lib/format";
import { STAGE_STYLES, PRIORITY_STYLES } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

/* Donut palette — sky-blue family used for the "Leads by Source" chart. */
const SOURCE_COLORS = ["#0ea5e9", "#38bdf8", "#0369a1", "#7dd3fc", "#0284c7", "#bae6fd"];

function GreetingHeader({ user }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  let greeting = "Good evening";
  if (hour < 5) greeting = "Good midnight";
  else if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const timeString = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
          {greeting}, <span className="capitalize">{user?.name?.split(" ")[0]}</span>!
        </h1>
        <p className="text-sm text-ink-soft mt-1 flex items-center gap-2">
          <Clock className="h-4 w-4" /> {timeString} - Here is your focus for today.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/leads"
          className="brand-gradient brand-gradient-hover inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> Add New Lead
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [range, setRange] = useState("monthly");

  const loadData = () => {
    contactsApi.list().then((res) => setContacts(res.contacts || [])).catch(() => {});
    leadsApi.list().then((res) => setLeads(res.leads || [])).catch(() => {});
    tasksApi.list().then((res) => setTasks(res.tasks || [])).catch(() => {});
    notesApi.list().then((res) => setNotes(res.notes || [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    analyticsApi.overview({ range }).then(setData).catch(() => setData(false));
  }, [range]);

  if (data === null) return <DashboardSkeleton />;
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <GreetingHeader user={user} />
      <div className="tour-ai-attention"><AiAttentionCenter /></div>

      {/* ── Main Dashboard Grid (Flattened for row alignment) ──────── */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        
        {/* Row 1 */}
        <HeroCard className="lg:col-span-3 h-full" value={stats.pipelineValue} />
        
        <Card className="tour-pipeline-engagement p-6 lg:col-span-6 h-full flex flex-col">
          <SectionHeading
            icon={CreditCard}
            title="Pipeline Engagement"
            subtitle="New leads per month"
            action={
              <Tabs
                value={range}
                onChange={setRange}
                tabs={[
                  { value: "monthly", label: "Monthly" },
                  { value: "annually", label: "Annually" },
                ]}
              />
            }
          />
          <div className="mt-4 flex-1">
            <EngagementChart trend={data?.trend || []} />
          </div>
        </Card>

        <Card className="p-6 lg:col-span-3 h-full flex flex-col">
          <SectionHeading title="Revenue Goal" subtitle="Closed-won total" to="/pipeline" />
          <p className="mt-4 text-center text-sm text-ink-soft">Total Won</p>
          <p className="text-center font-display text-3xl font-bold tracking-tight text-ink">
            {currency(stats.revenueWon)}
          </p>
          <BalanceChart trend={data?.trend || []} />
        </Card>

        {/* Row 2 */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          <div className="grid grid-cols-2 gap-4 flex-none">
            <Card className="p-4 flex-1">
              <p className="text-xs text-ink-soft">Revenue Won</p>
              <p className="mt-1 font-display text-lg font-bold text-emerald-600">
                {currency(stats.revenueWon, { compact: true })}
              </p>
            </Card>
            <Card className="p-4 flex-1">
              <p className="text-xs text-ink-soft">Forecasted</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {currency(stats.revenueForecast ?? 0, { compact: true })}
              </p>
            </Card>
            <Card className="p-4 flex-1">
              <p className="text-xs text-ink-soft">Win Rate</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {stats.conversionRate ?? 0}%
              </p>
            </Card>
            <Card className="p-4 flex-1">
              <p className="text-xs text-ink-soft">Deal Cycle</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {stats.avgDealCycle ?? 0} <span className="text-xs font-normal text-ink-soft">days</span>
              </p>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-6 h-full flex flex-col">
          <Card className="p-6 flex-1 flex flex-col">
            <SectionHeading title="Lead Activity" subtitle="Recent lead movements" to="/leads" />
            <div className="mt-4 flex-1">
              <ActivityTable leads={data?.recentLeads || []} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          <AiInsightsCard className="flex-none" />
          <TopDeals leads={leads} className="flex-1 h-full" />
        </div>

        {/* Row 3 */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          <UpcomingTasks tasks={tasks} onTaskComplete={loadData} className="flex-1 h-full" />
        </div>
        <PipelineByStage pipeline={data?.pipeline || []} className="lg:col-span-6 h-full" />
        <WinLossBySource data={data?.winLossBySource} className="lg:col-span-3 h-full" />

        {/* Row 4 */}
        <div className="lg:col-span-3 flex flex-col gap-5 h-full">
          <TopContactsCard contacts={contacts} className="flex-1 h-full" />
          <SalesIntelWidget className="flex-none" />
        </div>
        <RecentActivityStream notes={notes} leads={leads} className="lg:col-span-6 h-full" />
        <QuotaWidget stats={stats} className="lg:col-span-3 h-full" />
      </div>
    </div>
  );
}


/* -- Pipeline by stage (funnel-style breakdown) ----------------------- */
function PipelineByStage({ pipeline, className }) {
  const maxValue = Math.max(...pipeline.map((s) => s.value), 1);
  const totalValue = pipeline.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className={cn("p-6", className)}>
      <SectionHeading
        icon={Layers}
        title="Pipeline by Stage"
        subtitle="Deal value across each stage"
        to="/pipeline"
      />
      <div className="mt-5 space-y-4">
        {pipeline.map((s) => {
          const style = STAGE_STYLES[s.stage] || STAGE_STYLES.New;
          const pct = totalValue ? Math.round((s.value / totalValue) * 100) : 0;
          return (
            <div key={s.stage}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                  {s.stage}
                  <span className="text-ink-soft">· {s.count}</span>
                </span>
                <span className="font-semibold text-ink">
                  {currency(s.value, { compact: true })}
                  <span className="ml-1.5 text-xs font-normal text-ink-soft">{pct}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full transition-all", style.bar)}
                  style={{ width: `${Math.max((s.value / maxValue) * 100, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
        {pipeline.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-soft">No pipeline data yet.</p>
        )}
      </div>
    </Card>
  );
}

/* ── Win/Loss by Source ──────────────────────────────────────────────── */
function WinLossBySource({ data }) {
  return (
    <Card className="p-6">
      <SectionHeading icon={PieIcon} title="Win / Loss by Source" subtitle="Conversion rates" />
      {!data || data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">No source data yet.</p>
      ) : (
        <div className="mt-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e8eef3" strokeDasharray="4 4" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="won" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="Won Deals" />
                <Bar dataKey="lost" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Lost Deals" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Won</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Lost</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Upcoming follow-ups (next due tasks with quick checkoff) ───────────── */
function UpcomingTasks({ tasks, onTaskComplete }) {
  const upcoming = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 4);

  const handleQuickCheck = async (task) => {
    try {
      await tasksApi.update(task._id, { status: "Completed" });
      toast.success(`Task "${task.title}" completed!`);
      if (onTaskComplete) onTaskComplete();
    } catch (err) {
      toast.error(err?.message || "Failed to complete task");
    }
  };

  return (
    <Card className="flex flex-col p-6">
      <SectionHeading
        icon={CalendarClock}
        title="Upcoming Follow-ups"
        subtitle="Don't let these slip"
        to="/tasks"
      />
      {upcoming.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">You're all caught up 🎉</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {upcoming.map((t) => {
            const overdue = t.dueDate && isPast(new Date(t.dueDate));
            return (
              <li key={t._id} className="group flex items-start gap-3 rounded-xl p-1 transition hover:bg-surface-muted/50">
                <button
                  onClick={() => handleQuickCheck(t)}
                  title="Mark as completed"
                  className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line transition hover:border-brand-500 hover:bg-brand-50"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-brand-500" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                  <p className={cn("text-xs", overdue ? "text-rose-600 font-medium" : "text-ink-soft")}>
                    {t.dueDate ? shortDate(t.dueDate) : "No due date"}
                    {t.relatedLead?.name ? ` · ${t.relatedLead.name}` : ""}
                  </p>
                </div>
                <Badge className={PRIORITY_STYLES[t.priority]}>{t.priority}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── Top open deals (highest-value active leads) ────────────────────── */
function TopDeals({ leads }) {
  const deals = [...leads]
    .filter((l) => l.status !== "Won" && l.status !== "Lost")
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5);

  return (
    <Card className="flex flex-col p-6">
      <SectionHeading icon={Trophy} title="Top Open Deals" subtitle="Biggest active opportunities" to="/leads" />
      {deals.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">No open deals yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {deals.map((l, i) => {
            const style = STAGE_STYLES[l.status] || STAGE_STYLES.New;
            return (
              <li key={l._id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-soft">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-ink-soft">
                    <Building2 className="h-3 w-3" /> {l.company || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">
                    {currency(l.value, { compact: true })}
                  </p>
                  <span className={cn("text-[11px] font-medium", style.badge, "bg-transparent px-0")}>
                    {l.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── Engagement & Revenue Chart (Advanced Composed Chart) ────────────── */
function EngagementChart({ trend }) {
  const counts = trend.map((t) => t.leads);
  const max = Math.max(...counts, 1);
  const maxIndex = counts.indexOf(max);
  const prev = maxIndex > 0 ? counts[maxIndex - 1] : 0;
  const growth = prev > 0 ? Math.round(((max - prev) / prev) * 1000) / 10 : 17.8;

  // Custom label: render a rounded "+x%" bubble above the tallest bar only.
  const renderPeak = (props) => {
    const { x, y, width, index } = props;
    if (index !== maxIndex) return null;
    const cx = x + width / 2;
    return (
      <g>
        <circle cx={cx} cy={y} r={5} fill="#0369a1" stroke="#fff" strokeWidth={2} />
        <rect x={cx - 26} y={y - 34} width={52} height={22} rx={11} fill="#0369a1" />
        <text x={cx} y={y - 19} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
          +{growth}%
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={trend} barCategoryGap="20%" margin={{ top: 40, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e8eef3" strokeDasharray="4 4" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
          dy={6}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
          width={35}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#10b981", fontSize: 12 }}
          width={45}
          tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
        />
        <Tooltip cursor={{ fill: "#f1f5f9" }} content={<AdvancedChartTooltip />} />
        
        <Bar yAxisId="left" dataKey="leads" radius={[8, 8, 8, 8]} maxBarSize={42} label={renderPeak}>
          {trend.map((t, i) => (
            <Cell key={i} fill={i === maxIndex ? "#0369a1" : "#bae6fd"} />
          ))}
        </Bar>
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="won" 
          stroke="#10b981" 
          strokeWidth={3} 
          dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} 
          activeDot={{ r: 6 }} 
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function AdvancedChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-pop)] min-w-[140px]">
      <p className="mb-2 text-sm font-bold text-ink">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between text-sm mt-1">
          <span className="flex items-center gap-1.5 text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name === "leads" ? "New Leads" : "Revenue Won"}
          </span>
          <span className="font-semibold text-ink ml-4 tabular-nums">
            {entry.name === "leads" 
              ? Number(entry.value).toLocaleString() 
              : `₹${Number(entry.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  );
}

function BalanceChart({ trend }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={trend} margin={{ top: 14, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<ChartTooltip prefix="₹" />} />
        <Area type="monotone" dataKey="won" stroke="#0284c7" strokeWidth={2.5} fill="url(#balance)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label, prefix = "", unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="text-sm font-semibold text-ink">
        {prefix}
        {Number(payload[0].value).toLocaleString()}
        {unit}
      </p>
    </div>
  );
}

/* ── Recent activity table (Payment History style) ──────────────────── */
function ActivityTable({ leads }) {
  if (!leads.length)
    return <p className="py-10 text-center text-sm text-ink-soft">No recent activity yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="hidden pb-3 font-medium sm:table-cell">Time</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const style = STAGE_STYLES[l.status] || STAGE_STYLES.New;
            return (
              <tr
                key={l.id}
                className="border-t border-line transition hover:bg-surface-muted/50"
              >
                <td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={l.name} size="sm" />
                    <div>
                      <p className="font-medium text-ink">{l.name}</p>
                      <p className="text-xs text-ink-soft">{l.company || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 text-ink-soft">{shortDate(l.updatedAt)}</td>
                <td className="hidden py-3.5 text-ink-soft sm:table-cell">
                  {timeOf(l.updatedAt)}
                </td>
                <td className="py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                    <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                    {l.status}
                  </span>
                </td>
                <td className="py-3.5 text-right font-semibold text-ink">
                  {currency(l.value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Top contacts (avatar stack — the "Mandatory Payments" slot) ─────── */
function TopContactsCard({ contacts }) {
  const top = contacts.slice(0, 4);
  const overflow = Math.max(contacts.length - top.length, 0);

  return (
    <Card className="p-6">
      <SectionHeading title="Top Contacts" subtitle="Your key relationships" to="/contacts" />
      {contacts.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No contacts yet.</p>
      ) : (
        <div className="mt-5 flex items-center justify-between">
          <div className="flex -space-x-3">
            {top.map((c) => (
              <Avatar
                key={c._id}
                name={c.name}
                src={c.avatar}
                size="md"
                className="ring-2 ring-surface"
              />
            ))}
            {overflow > 0 && (
              <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-surface">
                +{overflow}
              </div>
            )}
          </div>
          <Link
            to="/contacts"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View all
          </Link>
        </div>
      )}
    </Card>
  );
}

function RecentActivityStream({ notes, leads }) {
  const recentNotes = notes
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  return (
    <Card className="p-6">
      <SectionHeading
        icon={Clock}
        title="Recent Activity Stream"
        subtitle="Latest notes & communications across leads"
        to="/notes"
      />
      {recentNotes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">No recent activity logged yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {recentNotes.map((n) => {
            const isEmail = n.content.startsWith("Email Sent:");
            return (
              <li key={n._id} className="flex items-start gap-3 rounded-xl border border-line/60 bg-surface p-3 shadow-2xs">
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs",
                    isEmail ? "bg-sky-50 text-sky-600" : "bg-brand-50 text-brand-600"
                  )}
                >
                  {isEmail ? "📧" : "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-semibold text-ink">
                      {isEmail ? "Outreach Email Sent" : "Note Added"}
                      {n.lead?.name ? ` · ${n.lead.name}` : ""}
                    </p>
                    <span className="text-[10px] text-ink-soft">{shortDate(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-soft">
                    {n.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-80" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-3">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <div className="space-y-5 lg:col-span-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="space-y-5 lg:col-span-3">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Industry News & Sales Intel ──────────────────────────────────────── */
function SalesIntelWidget() {
  const news = [
    {
      id: 1,
      tag: "Product Update",
      title: "RevFlux AI Copilot enters early preview for select Indian SMBs",
      date: "2 hours ago",
    },
    {
      id: 2,
      tag: "Market Intel",
      title: "Q4 B2B Sales Trends: Why WhatsApp outreach is beating email by 40%",
      date: "1 day ago",
    },
    {
      id: 3,
      tag: "Best Practices",
      title: "How to use the new DPDP compliance tools to secure enterprise deals",
      date: "3 days ago",
    }
  ];

  return (
    <Card className="flex flex-col p-6">
      <SectionHeading icon={Newspaper} title="Sales Intel & News" subtitle="Industry updates" />
      <ul className="mt-5 space-y-4">
        {news.map((item) => (
          <li key={item.id} className="group cursor-pointer">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-600">
              {item.tag}
            </span>
            <p className="text-sm font-semibold leading-snug text-ink transition group-hover:text-brand-600">
              {item.title}
            </p>
            <span className="mt-1 block text-xs text-ink-soft">{item.date}</span>
          </li>
        ))}
      </ul>
      <button className="mt-4 w-full rounded-xl bg-surface-muted py-2 text-xs font-semibold text-ink-soft transition hover:bg-surface hover:text-ink">
        Read More
      </button>
    </Card>
  );
}

/* ── Quota Attainment Widget ─────────────────────────────────────────── */
function QuotaWidget({ stats }) {
  const goal = 2500000; // 25L INR goal for the quarter/month
  const won = stats?.revenueWon || 0;
  const progress = Math.min(100, Math.round((won / goal) * 100));
  
  return (
    <Card className="p-6">
      <SectionHeading icon={CreditCard} title="Quota Attainment" subtitle="Q4 Target" />
      <div className="mt-5">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="font-display text-2xl font-bold text-ink tabular-nums">{currency(won, { compact: true })}</p>
            <p className="text-xs text-ink-soft mt-0.5">Won this quarter</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-brand-700">{progress}%</p>
            <p className="text-xs text-ink-soft mt-0.5">of {currency(goal, { compact: true })}</p>
          </div>
        </div>
        <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden border border-line/60">
          <div 
            className="h-full bg-brand-500 rounded-full relative" 
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

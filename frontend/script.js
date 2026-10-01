const fs = require('fs');

const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = unction GreetingHeader({ user }) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
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
          <Clock className="h-4 w-4" /> {timeString} — Here is your focus for today.
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
  const [data, setData] = React.useState(null);
  const [contacts, setContacts] = React.useState([]);
  const [leads, setLeads] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [notes, setNotes] = React.useState([]);
  const [range, setRange] = React.useState("monthly");

  const loadData = () => {
    contactsApi.list().then((res) => setContacts(res.contacts || [])).catch(() => {});
    leadsApi.list().then((res) => setLeads(res.leads || [])).catch(() => {});
    tasksApi.list().then((res) => setTasks(res.tasks || [])).catch(() => {});
    notesApi.list().then((res) => setNotes(res.notes || [])).catch(() => {});
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    analyticsApi.overview({ range }).then(setData).catch(() => setData(false));
  }, [range]);

  if (data === null) return <DashboardSkeleton />;
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <GreetingHeader user={user} />
      <AiAttentionCenter />

      {/* -- Main Dashboard Grid (Flattened for row alignment) -------- */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 auto-rows-fr">
        
        {/* Row 1 */}
        <HeroCard className="lg:col-span-3 h-full" value={stats.pipelineValue} />
        
        <Card className="p-6 lg:col-span-6 h-full flex flex-col">
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
};

const startMarker = "export default function Dashboard() {";
const endMarker = "/* -- Pipeline by stage (funnel-style breakdown) ----------------------- */";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + "\n\n" + content.substring(endIndex);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Success");
} else {
  console.log("Failed to find markers");
}

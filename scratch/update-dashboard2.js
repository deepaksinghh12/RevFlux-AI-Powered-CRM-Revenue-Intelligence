const fs = require('fs');

const path = 'frontend/src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* ── Main Dashboard Grid (Original 3-Column Layout) ───────────── */}';

const startIndex = content.indexOf(startMarker);
const nextComponentStart = content.indexOf('/* -- Pipeline by stage');

// Just slice off whatever is between these two, minus the closing part of Dashboard.
// Actually, let's just use regex or find `  );\r?\n}`
let endOfDashboardIndex = -1;
const lines = content.substring(0, nextComponentStart).split('\n');
// The last few lines should be:
//     </div>
//   );
// }
// Let's find the closing brace index.
for (let i = nextComponentStart; i > startIndex; i--) {
    if (content.substring(i, i+3) === '}\r\n' || content.substring(i, i+2) === '}\n') {
        endOfDashboardIndex = content.lastIndexOf('  );', i);
        break;
    }
}

if (startIndex === -1 || nextComponentStart === -1 || endOfDashboardIndex === -1) {
    console.error('Cannot find boundaries', { startIndex, nextComponentStart, endOfDashboardIndex });
    process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endOfDashboardIndex);

const newLayout = `      {/* ── Action Center Grid (2-Column Layout) ───────────── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* ── Left Column: Operations & Workflow (8 Cols) ── */}
        <div className="space-y-5 lg:col-span-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UpcomingTasks tasks={tasks} onTaskComplete={loadData} />
            <RecentActivityStream notes={notes} leads={leads} />
          </div>

          <Card className="tour-pipeline-engagement p-6">
            <SectionHeading
              icon={CreditCard}
              title="Pipeline Velocity & Engagement"
              subtitle="New leads vs Won revenue"
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
            <div className="mt-4">
              <EngagementChart trend={data?.trend || []} />
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Lead Activity"
              subtitle="Recent lead movements"
              to="/leads"
            />
            <div className="mt-4">
              <ActivityTable leads={data?.recentLeads || []} />
            </div>
          </Card>

          <PipelineByStage pipeline={data?.pipeline || []} />
        </div>

        {/* ── Right Column: AI Insights & Goals (4 Cols) ── */}
        <div className="space-y-5 lg:col-span-4">
          <AiInsightsCard />
          
          {/* Quota Attainment Card */}
          <Card className="p-6 border-brand-200 bg-brand-50/30">
            <SectionHeading title="Quota Attainment" subtitle="Q3 Revenue Target" to="/pipeline" />
            <div className="mt-5">
              <div className="flex justify-between items-end mb-2">
                <p className="font-display text-2xl font-bold tracking-tight text-ink">
                  {currency(stats.revenueWon, { compact: true })}
                </p>
                <p className="text-sm font-semibold text-ink-soft">
                  Target: {currency(12000000, { compact: true })}
                </p>
              </div>
              
              <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 rounded-full transition-all duration-1000" 
                  style={{ width: \`\${Math.min(100, Math.round(((stats.revenueWon || 0) / 12000000) * 100))}%\` }} 
                />
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    <ArrowUpRight className="h-3 w-3" /> +14.2% MoM
                  </span>
                  <span className="text-[11px] text-ink-soft">vs last month</span>
                </div>
                <span className="text-xs font-bold text-brand-700">
                  {Math.round(((stats.revenueWon || 0) / 12000000) * 100)}% to Goal
                </span>
              </div>
            </div>
          </Card>

          <TopContactsCard contacts={contacts} />
          <SalesIntelWidget />
          
          {/* Win/Loss by Source */}
          <Card className="p-5">
            <SectionHeading title="Acquisition Sources" subtitle="Win/loss breakdown" />
            <div className="mt-4 space-y-3">
              {(data?.winLossBySource || []).map((src) => (
                <div key={src.source} className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{src.source || "Other"}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{src.winRate}%</span>
                    <span className="text-[10px] text-ink-soft w-12 text-right">({src.won}/{src.total})</span>
                  </div>
                </div>
              ))}
              {(!data?.winLossBySource || data.winLossBySource.length === 0) && (
                <p className="text-xs text-ink-soft text-center py-2">No source data available.</p>
              )}
            </div>
          </Card>
        </div>
      </div>\n`;

fs.writeFileSync(path, before + newLayout + after);
console.log('Replaced successfully');

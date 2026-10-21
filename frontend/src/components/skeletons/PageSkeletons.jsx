import { Skeleton, SkeletonCard, SkeletonText, SkeletonTable } from "../ui";

/**
 * Dashboard page skeleton matching the actual KPI grid, charts, AI attention center,
 * and upcoming tasks sidebar layout.
 */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6 animate-fade-up">
      <span className="sr-only">Loading dashboard analytics and pipeline data...</span>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: 8 cols charts/AI + 4 cols sidebar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Left Column (8 cols) */}
        <div className="space-y-5 lg:col-span-8">
          {/* AI Attention Center Skeleton */}
          <div className="rounded-2xl border border-brand-200/50 bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-56 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2.5 pt-2">
              <div className="rounded-xl border border-line p-3.5 flex items-center justify-between">
                <div className="space-y-1.5 w-2/3">
                  <Skeleton className="h-3.5 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-4/5 rounded-md" />
                </div>
                <Skeleton className="h-7 w-24 rounded-xl" />
              </div>
              <div className="rounded-xl border border-line p-3.5 flex items-center justify-between">
                <div className="space-y-1.5 w-2/3">
                  <Skeleton className="h-3.5 w-2/5 rounded-md" />
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                </div>
                <Skeleton className="h-7 w-24 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Pipeline Trend Chart Skeleton */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
            <div className="h-64 rounded-xl bg-surface-muted/30 flex items-end gap-4 p-6 justify-between">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <Skeleton
                    className="w-full rounded-t-lg"
                    style={{ height: `${25 + (idx * 11) % 70}%` }}
                  />
                  <Skeleton className="h-3 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel Skeleton */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (4 cols) */}
        <div className="space-y-5 lg:col-span-4">
          {/* Upcoming Tasks Skeleton */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-xl" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="space-y-2.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-line p-3 flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-md mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-4/5 rounded-md" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16 rounded-md" />
                      <Skeleton className="h-3 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team / Recent Activity Skeleton */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="space-y-3 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                      <Skeleton className="h-3 w-16 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Leads page skeleton matching KPI metrics, filter row, stage chips,
 * and the comprehensive lead data table.
 */
export function LeadsSkeleton() {
  return (
    <div role="status" aria-label="Loading leads" className="space-y-5 animate-fade-up">
      <span className="sr-only">Loading leads dataset and pipeline stages...</span>

      {/* KPI Cards Row (4 cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* Search & Filter Bar Card */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-9 w-full lg:w-72 rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
        {/* Stage Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/60">
          {["All", "New", "Contacted", "Qualified", "Proposal", "Won", "Lost"].map((s, i) => (
            <Skeleton
              key={s}
              className={`h-7 rounded-xl ${i === 0 ? "w-14" : "w-20"}`}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Leads Table Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-muted/40 px-6 py-3.5 text-xs">
          <div className="flex items-center gap-3 w-1/3">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-16 rounded-md" />
          <Skeleton className="h-3.5 w-16 rounded-md" />
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-12 rounded-md" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-line/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3 w-1/3">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-4/5 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Contacts page skeleton matching KPI metrics, search filter, and contacts table.
 */
export function ContactsSkeleton() {
  return (
    <div role="status" aria-label="Loading contacts" className="space-y-5 animate-fade-up">
      <span className="sr-only">Loading contacts directory...</span>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:w-72 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
      </div>

      {/* Contacts Table Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
        <div className="flex items-center justify-between border-b border-line bg-surface-muted/40 px-6 py-3.5">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-12 rounded-md" />
        </div>
        <div className="divide-y divide-line/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3 w-1/3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tasks page skeleton matching task view tabs, search filter, and list cards.
 */
export function TasksSkeleton() {
  return (
    <div role="status" aria-label="Loading tasks" className="space-y-5 animate-fade-up">
      <span className="sr-only">Loading tasks and follow-up activities...</span>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Tabs and Action Bar */}
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-full sm:w-64 rounded-xl" />
      </div>

      {/* Task List Items */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-surface p-4 shadow-xs flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 flex-1">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/5 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="h-3 w-2 rounded-full" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

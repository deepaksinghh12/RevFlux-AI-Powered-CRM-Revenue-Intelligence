import { useState } from "react";
import { Sparkles, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

export function PipelinePulse() {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <section id="pipeline-pulse" className="py-20 bg-surface border-y border-line">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">

          {/* LEFT — Messaging (roughly 5/12) */}
          <div className="lg:w-5/12 shrink-0 mb-10 lg:mb-0 lg:sticky lg:top-28">
            <h2 className="font-display text-3xl sm:text-[2.5rem] font-bold text-ink leading-tight tracking-tight">
              Know what deserves your attention.
            </h2>
            <p className="mt-4 text-base text-ink-soft leading-relaxed max-w-md">
              RevFlux reads the signals across your pipeline and surfaces the opportunities that need action — so you spend less time searching and more time selling.
            </p>

            {/* Compact data flow */}
            <div className="mt-8 flex items-center gap-2 text-xs font-medium text-ink-soft">
              <span className="px-2.5 py-1 rounded bg-canvas border border-line">CRM Data</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-brand-50 border border-brand-200 text-brand-700">AI Intelligence</span>
              <span>→</span>
              <span className="px-2.5 py-1 rounded bg-ink text-white">Next Action</span>
            </div>
          </div>

          {/* RIGHT — Pipeline Pulse + Attention Center (roughly 7/12) */}
          <div className="lg:w-7/12">
            <div className="rounded-2xl border border-line bg-canvas shadow-sm overflow-hidden">

              {/* Pipeline Pulse header */}
              <div className="px-5 py-4 border-b border-line bg-surface/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-xs text-ink tracking-widest uppercase">Pipeline Pulse</span>
                    </div>
                    <div className="text-2xl font-bold text-ink">42 <span className="text-base text-ink-soft font-medium">Opportunities</span></div>
                  </div>

                  <div className="flex gap-5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="font-semibold text-ink">7</span>
                      <span className="text-ink-soft hidden sm:inline">Attention</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="font-semibold text-ink">11</span>
                      <span className="text-ink-soft hidden sm:inline">Follow-up</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-ink">24</span>
                      <span className="text-ink-soft hidden sm:inline">Healthy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Priorities */}
              <div className="px-5 pt-4 pb-2">
                <h3 className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">Today's Priorities</h3>
              </div>

              <div className="divide-y divide-line">
                {/* Priority 1 */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(1)}>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs text-rose-400 font-bold bg-rose-50 h-7 w-7 rounded flex items-center justify-center">01</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-rose-500" />
                          <h4 className="font-bold text-sm text-ink">Acme Corp</h4>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">Proposal stalled for 12 days → <span className="text-rose-600 font-medium">Follow up today</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="h-7 w-7 rounded flex items-center justify-center bg-surface border border-line text-ink-soft hover:text-ink transition-colors">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded flex items-center justify-center text-ink-soft hover:text-ink transition-colors">
                        {expanded === 1 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {expanded === 1 && (
                    <div className="mt-3 ml-10 bg-rose-50/50 border border-rose-100 rounded-lg p-3 animate-fade-up text-xs">
                      <p className="font-semibold text-rose-800 mb-2 uppercase tracking-wide text-[10px]">Why is this flagged?</p>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between"><span className="text-ink-soft">No recent activity</span><span className="font-bold text-ink">48%</span></div>
                        <div className="w-full bg-rose-200 rounded-full h-1"><div className="bg-rose-500 h-1 rounded-full" style={{ width: '48%' }} /></div>
                        <div className="flex justify-between mt-1"><span className="text-ink-soft">Proposal aging</span><span className="font-bold text-ink">27%</span></div>
                        <div className="w-full bg-amber-200 rounded-full h-1"><div className="bg-amber-500 h-1 rounded-full" style={{ width: '27%' }} /></div>
                        <div className="flex justify-between mt-1"><span className="text-ink-soft">Low engagement</span><span className="font-bold text-ink">16%</span></div>
                        <div className="w-full bg-amber-200 rounded-full h-1"><div className="bg-amber-400 h-1 rounded-full" style={{ width: '16%' }} /></div>
                      </div>
                      <div className="bg-white border border-brand-100 rounded p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-brand-600" />
                          <span className="font-semibold text-[10px] text-brand-700 uppercase tracking-wide">AI Recommendation</span>
                        </div>
                        <p className="text-ink text-xs">"Follow up with the primary contact today."</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority 2 */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs text-amber-400 font-bold bg-amber-50 h-7 w-7 rounded flex items-center justify-center">02</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <h4 className="font-bold text-sm text-ink">Nova Systems</h4>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">Engagement declining → <span className="text-amber-600 font-medium">Re-engage contact</span></p>
                      </div>
                    </div>
                    <button className="h-7 w-7 rounded flex items-center justify-center bg-surface border border-line text-ink-soft hover:text-ink transition-colors">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Priority 3 */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs text-amber-400 font-bold bg-amber-50 h-7 w-7 rounded flex items-center justify-center">03</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <h4 className="font-bold text-sm text-ink">Orbit Labs</h4>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">Decision maker unresponsive → <span className="text-amber-600 font-medium">Schedule follow-up</span></p>
                      </div>
                    </div>
                    <button className="h-7 w-7 rounded flex items-center justify-center bg-surface border border-line text-ink-soft hover:text-ink transition-colors">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

import { AlertTriangle, Activity } from "lucide-react";

export function DealAutopsy() {
  return (
    <section className="py-24 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-16">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl animate-fade-up">
          Don't just see where a deal is.<br />
          Understand what changed.
        </h2>
      </div>

      <div className="mx-auto max-w-5xl animate-fade-up animate-delay-100">
        <div className="rounded-2xl border border-line bg-surface p-1 shadow-lg relative">
          <div className="absolute top-4 right-4 bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm z-10">
            DEAL AUTOPSY
          </div>

          <div className="bg-canvas rounded-xl border border-line p-8 flex flex-col lg:flex-row gap-12">
            
            {/* Deal Journey */}
            <div className="flex-1 border-r border-line/50 pr-0 lg:pr-8">
              <h3 className="text-sm font-bold text-ink-soft uppercase tracking-widest mb-8">Acme Corp Deal Journey</h3>
              
              <div className="relative border-l-2 border-line ml-3 space-y-8">
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-brand-500" />
                  <p className="font-bold text-ink text-sm">Lead Created</p>
                  <p className="text-xs text-ink-soft">Oct 1 • Marketing source</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-brand-500" />
                  <p className="font-bold text-ink text-sm">Contacted</p>
                  <p className="text-xs text-ink-soft">Oct 2 • Initial call completed</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-brand-500" />
                  <p className="font-bold text-ink text-sm">Qualified</p>
                  <p className="text-xs text-ink-soft">Oct 5 • Budget confirmed</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-surface border-2 border-brand-500" />
                  <p className="font-bold text-ink text-sm">Proposal</p>
                  <p className="text-xs text-ink-soft">Oct 10 • Sent via DocuSign</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </div>
                  <p className="font-bold text-rose-600 text-sm flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Stalled
                  </p>
                  <p className="text-xs text-rose-500/80">Today • Health score dropping</p>
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-surface border border-line rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-ink mb-6 text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-600" /> Why did this deal need attention?
                </h4>

                <div className="space-y-4 mb-8">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink">No recent activity</span>
                      <span className="font-bold text-ink">48%</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-1.5">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '48%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink">Proposal aging</span>
                      <span className="font-bold text-ink">27%</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '27%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink">Low engagement</span>
                      <span className="font-bold text-ink">16%</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '16%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink">Other signals</span>
                      <span className="font-bold text-ink">9%</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-1.5">
                      <div className="bg-line-strong h-1.5 rounded-full" style={{ width: '9%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-700 mb-2">RevFlux Recommendation</h5>
                  <p className="text-sm text-brand-900 font-medium mb-3">
                    "Follow up with the primary contact today. Mention the new enterprise SLA terms."
                  </p>
                  <button className="text-xs font-medium bg-brand-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-brand-700 transition w-full">
                    View Recommended Action
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

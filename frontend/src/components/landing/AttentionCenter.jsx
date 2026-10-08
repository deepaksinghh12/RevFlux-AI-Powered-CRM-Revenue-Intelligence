import { ChevronRight } from "lucide-react";

export function AttentionCenter() {
  return (
    <section className="py-24 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <div className="flex-1 space-y-6">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl animate-fade-up">
              Stop searching your CRM for work.
            </h2>
            <p className="text-lg text-ink-soft leading-relaxed animate-fade-up animate-delay-100">
              RevFlux surfaces the opportunities that deserve your attention today. The Attention Center automatically prioritizes stalled deals, unresponsive contacts, and important follow-ups.
            </p>
          </div>

          <div className="flex-1 w-full max-w-xl animate-fade-up animate-delay-200">
            <div className="rounded-2xl border border-line bg-surface p-1 shadow-lg relative">
              <div className="absolute top-4 right-4 bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                ATTENTION CENTER
              </div>
              
              <div className="bg-canvas rounded-xl border border-line p-6">
                <h3 className="font-bold text-ink mb-6">What deserves your attention today?</h3>
                
                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="flex gap-4 p-4 rounded-lg border border-rose-200 bg-rose-50/50">
                    <div className="mt-1 font-mono text-sm text-rose-400 font-bold">01</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <h4 className="font-bold text-ink text-sm">Acme Corp</h4>
                      </div>
                      <p className="text-sm text-ink-soft mb-3">Proposal stalled for 12 days.</p>
                      
                      <div className="bg-white rounded-md border border-rose-100 p-3">
                        <p className="text-xs font-semibold text-rose-700 mb-2 uppercase tracking-wide">Suggested Action</p>
                        <p className="text-sm text-ink font-medium mb-3">Follow up today.</p>
                        <div className="flex gap-2">
                          <button className="text-xs font-medium bg-rose-600 text-white px-3 py-1.5 rounded hover:bg-rose-700 transition">
                            Draft Follow-up
                          </button>
                          <button className="text-xs font-medium bg-surface border border-line text-ink px-3 py-1.5 rounded hover:bg-surface-muted transition">
                            Open Deal
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                    <div className="mt-1 font-mono text-sm text-amber-400 font-bold">02</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <h4 className="font-bold text-ink text-sm">Nova Systems</h4>
                      </div>
                      <p className="text-sm text-ink-soft mb-2">No activity for 6 days.</p>
                      <div className="flex items-center justify-between mt-2">
                         <p className="text-xs font-medium text-amber-700">Action: Re-engage contact.</p>
                         <ChevronRight className="h-4 w-4 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                    <div className="mt-1 font-mono text-sm text-amber-400 font-bold">03</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <h4 className="font-bold text-ink text-sm">Orbit Labs</h4>
                      </div>
                      <p className="text-sm text-ink-soft mb-2">Decision maker has not responded.</p>
                      <div className="flex items-center justify-between mt-2">
                         <p className="text-xs font-medium text-amber-700">Action: Schedule follow-up.</p>
                         <ChevronRight className="h-4 w-4 text-amber-400" />
                      </div>
                    </div>
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

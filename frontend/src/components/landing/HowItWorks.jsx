import { Database, BrainCircuit, Target, Zap, RotateCcw, ArrowDown } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="py-24 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl mb-16 animate-fade-up">
          How RevFlux thinks
        </h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            
            {/* Connectors for desktop */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-line z-0" />
            
            <div className="flex flex-col items-center relative z-10 animate-fade-up animate-delay-100">
              <div className="h-24 w-24 rounded-2xl bg-surface border border-line flex flex-col items-center justify-center gap-2 shadow-sm mb-4">
                <Database className="h-6 w-6 text-ink-soft" />
              </div>
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-2">Capture</h3>
              <p className="text-xs text-ink-soft px-2">Leads, contacts and activity</p>
              <ArrowDown className="h-4 w-4 text-line mt-4 md:hidden" />
            </div>

            <div className="flex flex-col items-center relative z-10 animate-fade-up animate-delay-200">
              <div className="h-24 w-24 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col items-center justify-center gap-2 shadow-sm mb-4">
                <BrainCircuit className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-2">Understand</h3>
              <p className="text-xs text-ink-soft px-2">Pipeline context and CRM signals</p>
              <ArrowDown className="h-4 w-4 text-line mt-4 md:hidden" />
            </div>

            <div className="flex flex-col items-center relative z-10 animate-fade-up animate-delay-300">
              <div className="h-24 w-24 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center gap-2 shadow-sm mb-4">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-2">Prioritize</h3>
              <p className="text-xs text-ink-soft px-2">Identify opportunities needing attention</p>
              <ArrowDown className="h-4 w-4 text-line mt-4 md:hidden" />
            </div>

            <div className="flex flex-col items-center relative z-10 animate-fade-up animate-delay-400">
              <div className="h-24 w-24 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center gap-2 shadow-sm mb-4">
                <Zap className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-2">Act</h3>
              <p className="text-xs text-ink-soft px-2">Tasks, follow-ups and recommendations</p>
              <ArrowDown className="h-4 w-4 text-line mt-4 md:hidden" />
            </div>

            <div className="flex flex-col items-center relative z-10 animate-fade-up animate-delay-500">
              <div className="h-24 w-24 rounded-2xl bg-surface border border-line flex flex-col items-center justify-center gap-2 shadow-sm mb-4">
                <RotateCcw className="h-6 w-6 text-ink-soft" />
              </div>
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider mb-2">Learn</h3>
              <p className="text-xs text-ink-soft px-2">Keep the pipeline context updated</p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowDown } from "lucide-react";

export function PositioningSection() {
  return (
    <section className="py-24 bg-surface border-y border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl mb-16 animate-fade-up">
          Traditional CRMs store information.<br />
          RevFlux helps you act on it.
        </h2>

        <div className="flex flex-col md:flex-row justify-center gap-8 lg:gap-16 max-w-4xl mx-auto">
          
          <div className="flex-1 bg-canvas border border-line rounded-2xl p-8 opacity-70 animate-fade-up animate-delay-100">
            <h3 className="font-bold text-ink-soft mb-8 uppercase tracking-widest text-sm">Traditional CRM</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="px-6 py-3 border border-line rounded bg-surface w-full">Store data</div>
              <ArrowDown className="h-4 w-4 text-line-strong" />
              <div className="px-6 py-3 border border-line rounded bg-surface w-full">Search</div>
              <ArrowDown className="h-4 w-4 text-line-strong" />
              <div className="px-6 py-3 border border-line rounded bg-surface w-full">Analyze manually</div>
              <ArrowDown className="h-4 w-4 text-line-strong" />
              <div className="px-6 py-3 border border-line rounded bg-surface w-full">Decide</div>
              <ArrowDown className="h-4 w-4 text-line-strong" />
              <div className="px-6 py-3 border border-line rounded bg-surface w-full font-bold">Act</div>
            </div>
          </div>

          <div className="flex-1 bg-white border border-brand-200 shadow-xl rounded-2xl p-8 animate-fade-up animate-delay-200">
            <h3 className="font-bold text-brand-700 mb-8 uppercase tracking-widest text-sm">RevFlux</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="px-6 py-3 border border-line rounded bg-surface w-full">Store data</div>
              <ArrowDown className="h-4 w-4 text-brand-300" />
              <div className="px-6 py-3 border border-brand-200 rounded bg-brand-50 w-full text-brand-700 font-medium">AI understands context</div>
              <ArrowDown className="h-4 w-4 text-brand-300" />
              <div className="px-6 py-3 border border-brand-200 rounded bg-brand-50 w-full text-brand-700 font-medium">Signals surface</div>
              <ArrowDown className="h-4 w-4 text-brand-300" />
              <div className="px-6 py-3 border border-brand-200 rounded bg-brand-50 w-full text-brand-700 font-medium">Next best action</div>
              <ArrowDown className="h-4 w-4 text-brand-500" />
              <div className="px-6 py-3 rounded bg-brand-600 text-white w-full font-bold shadow-md">Act</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

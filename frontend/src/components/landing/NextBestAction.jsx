import { ArrowDown, Database, Sparkles, Target } from "lucide-react";

export function NextBestAction() {
  return (
    <section className="py-24 bg-surface border-y border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl mb-4 animate-fade-up">
          Know what to do next.
        </h2>
        <p className="text-lg text-ink-soft max-w-2xl mx-auto mb-16 animate-fade-up animate-delay-100">
          Less CRM archaeology. More selling.
        </p>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 animate-fade-up animate-delay-200">
          
          {/* Data Flow visualization */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-canvas border border-line text-ink font-semibold shadow-sm w-64 justify-center">
              <Database className="h-5 w-5 text-ink-soft" /> CRM DATA
            </div>
            <ArrowDown className="h-5 w-5 text-line-strong" />
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-bold shadow-sm w-64 justify-center">
              <Sparkles className="h-5 w-5" /> AI INTELLIGENCE
            </div>
            <ArrowDown className="h-5 w-5 text-brand-300" />
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-ink text-white font-bold shadow-md w-64 justify-center">
              <Target className="h-5 w-5" /> NEXT BEST ACTION
            </div>
          </div>

          {/* Priorities List */}
          <div className="w-full max-w-md text-left">
            <div className="bg-canvas border border-line rounded-2xl shadow-lg p-6">
              <h3 className="text-sm font-bold text-ink-soft uppercase tracking-widest mb-6">Today's Sales Priorities</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-center p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-line group">
                  <div className="font-mono text-brand-400 font-bold text-sm bg-brand-50 h-8 w-8 rounded flex items-center justify-center group-hover:bg-brand-100 transition-colors">01</div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">Acme Corp</h4>
                    <p className="text-sm text-ink-soft">Follow up on proposal</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-center p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-line group">
                  <div className="font-mono text-ink-soft font-bold text-sm bg-surface-muted h-8 w-8 rounded flex items-center justify-center">02</div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">Nova Systems</h4>
                    <p className="text-sm text-ink-soft">Re-engage contact</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-line group">
                  <div className="font-mono text-ink-soft font-bold text-sm bg-surface-muted h-8 w-8 rounded flex items-center justify-center">03</div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">Orbit Labs</h4>
                    <p className="text-sm text-ink-soft">Schedule demo</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-line group">
                  <div className="font-mono text-ink-soft font-bold text-sm bg-surface-muted h-8 w-8 rounded flex items-center justify-center">04</div>
                  <div>
                    <h4 className="font-bold text-ink text-sm">Vertex Labs</h4>
                    <p className="text-sm text-ink-soft">Review inactive opportunity</p>
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

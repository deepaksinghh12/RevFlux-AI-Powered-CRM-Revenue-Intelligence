import { BrainCircuit, Bot, AlertTriangle, FileText, ArrowRight } from "lucide-react";

export function AiSection() {
  return (
    <section id="ai-copilot" className="py-24 bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl animate-fade-up">
            Your CRM, with an AI layer.
          </h2>
          <p className="mt-4 text-lg text-white/70 leading-relaxed animate-fade-up animate-delay-100">
            RevFlux doesn't just store your sales data. It helps your team understand it.
          </p>
        </div>

        {/* Visual pipeline */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center mb-16 animate-fade-up animate-delay-200">
          <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm">CRM DATA</div>
          <ArrowRight className="hidden md:block h-4 w-4 text-white/40" />
          <div className="px-6 py-3 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300 font-bold text-sm">AI INTELLIGENCE</div>
          <ArrowRight className="hidden md:block h-4 w-4 text-white/40" />
          <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm">ACTIONABLE INSIGHTS</div>
          <ArrowRight className="hidden md:block h-4 w-4 text-white/40" />
          <div className="px-6 py-3 rounded-xl bg-white text-ink font-bold text-sm">NEXT BEST ACTION</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up animate-delay-300">
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="font-bold mb-2">AI Risk Scoring</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Identify opportunities that may need attention based on activity and engagement signals.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
              <BrainCircuit className="h-5 w-5 text-brand-400" />
            </div>
            <h3 className="font-bold mb-2">Lead Intelligence</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Generate concise context-aware summaries from your existing CRM records.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
              <Bot className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-bold mb-2">AI Copilot</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Ask questions about CRM information and get immediate answers without digging.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-rose-400" />
            </div>
            <h3 className="font-bold mb-2">Email Drafting</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Create context-aware sales follow-ups based on the opportunity history.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

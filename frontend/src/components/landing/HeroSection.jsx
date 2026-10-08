import { Link } from "react-router-dom";
import { Badge, Button } from "../ui";
import { Search, Sparkles, Bot } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 lg:pt-20 pb-0">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
      <div className="absolute top-1/3 right-0 w-[600px] h-[400px] bg-brand-400/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Two-column hero */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16 pb-8 lg:pb-10">

          {/* LEFT — Messaging (5/12) */}
          <div className="lg:w-5/12 shrink-0 pb-8 lg:pb-0">
            <Badge className="mb-4 inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border-brand-200 shadow-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              AI-POWERED CRM
            </Badge>

            <h1 className="font-display text-[2.75rem] sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-extrabold tracking-tight text-ink leading-[1.1]">
              Your pipeline.<br />
              <span className="text-brand-600">Your AI copilot.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-ink-soft leading-relaxed max-w-lg">
              RevFlux turns CRM activity into clear signals, so your team knows what needs attention and what to do next.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button size="lg" className="h-11 px-7 text-[15px] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-11 px-7 text-[15px] bg-surface border-line hover:bg-surface-muted transition-colors">
                  Sign In
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-ink-soft">
              <a href="#pipeline-pulse" className="hover:text-brand-700 transition-colors inline-flex items-center gap-1">See how RevFlux works <span aria-hidden="true">↓</span></a>
            </p>
          </div>

          {/* RIGHT — Product Visual (7/12) */}
          <div className="lg:w-7/12 relative">
            <div className="absolute -top-3 left-4 bg-brand-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20 pointer-events-none">
              INSIDE REVFLUX
            </div>

            <div className="rounded-2xl border border-line bg-surface/40 p-1.5 sm:p-2 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.12)]">
              <div className="overflow-hidden rounded-t-xl lg:rounded-xl border border-line bg-canvas shadow-sm">

                {/* Faux Header */}
                <div className="flex items-center justify-between border-b border-line px-3 sm:px-4 py-2 bg-surface">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-line" />
                    <div className="h-2.5 w-2.5 rounded-full bg-line" />
                    <div className="h-2.5 w-2.5 rounded-full bg-line" />
                  </div>
                  <div className="hidden sm:flex h-6 w-full max-w-[220px] items-center rounded-md bg-canvas px-2.5 text-[10px] text-ink-soft border border-line">
                    <Search className="h-3 w-3 mr-1.5 shrink-0" /><span className="truncate">Search leads, contacts...</span>
                  </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 sm:p-4 bg-canvas text-left">
                  {/* Main */}
                  <div className="sm:col-span-8 flex flex-col gap-3">
                    {/* AI Insight */}
                    <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                        <span className="font-semibold text-xs text-brand-900">AI Intelligence</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-md border border-line bg-surface p-2.5 shadow-sm gap-2">
                        <div>
                          <p className="text-xs font-bold text-ink">Acme Corp — Enterprise Deal</p>
                          <p className="text-[11px] text-brand-700 font-medium flex items-center gap-1 mt-0.5">
                            <Bot className="h-3 w-3 shrink-0" /> Medium Risk · Follow up today
                          </p>
                        </div>
                        <div className="px-2.5 py-1 bg-brand-100 text-brand-700 text-[10px] font-semibold rounded text-center whitespace-nowrap">
                          View Action
                        </div>
                      </div>
                    </div>

                    {/* Pipeline columns */}
                    <div className="grid grid-cols-3 gap-2">
                      {["Qualified", "Proposal", "Negotiation"].map((stage, i) => (
                        <div key={stage} className="rounded-lg border border-line bg-surface p-2.5 shadow-sm">
                          <div className="text-[10px] font-bold text-ink-soft mb-2">{stage}</div>
                          <div className={`h-8 w-full bg-canvas border rounded-md p-1.5 flex flex-col justify-center ${i === 1 ? 'border-brand-300 relative overflow-hidden' : 'border-line'}`}>
                            {i === 1 && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-500" />}
                            <div className="h-1 w-2/3 bg-ink/15 rounded-full mb-0.5" />
                            <div className="h-1 w-1/3 bg-ink/10 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tasks */}
                    <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-ink-soft mb-2">Tasks</div>
                      <div className="flex items-center gap-2 border-b border-line/50 pb-2 mb-2">
                        <div className="h-3.5 w-3.5 rounded border border-line flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-ink">Follow up with Acme</div>
                          <div className="text-[10px] text-rose-500 font-medium">Due today</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 rounded border border-line flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-ink">Send proposal to Nova</div>
                          <div className="text-[10px] text-ink-soft">Due tomorrow</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="sm:col-span-4 flex flex-col gap-3">
                    <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                      <div className="text-[10px] font-bold text-ink-soft mb-2">Deal Activity</div>
                      <div className="flex items-start gap-2 mt-1">
                        <div className="h-5 w-5 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-ink">Stalled</div>
                          <div className="text-[10px] text-ink-soft">6 days ago</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 mt-2">
                        <div className="h-5 w-5 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                          <Sparkles className="h-2.5 w-2.5 text-brand-600" />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-brand-700">AI Note</div>
                          <div className="text-[10px] text-ink-soft">Engagement dropping</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-3 shadow-sm flex-1">
                      <div className="text-[10px] font-bold text-ink-soft mb-1">Pipeline Value</div>
                      <div className="text-lg font-bold text-ink">$42,500</div>
                      <div className="flex items-end gap-0.5 mt-3 h-12">
                        <div className="w-1/4 bg-brand-200 h-[30%] rounded-t-sm" />
                        <div className="w-1/4 bg-brand-300 h-[50%] rounded-t-sm" />
                        <div className="w-1/4 bg-brand-400 h-[80%] rounded-t-sm" />
                        <div className="w-1/4 bg-brand-500 h-full rounded-t-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal strip */}
        <div className="border-t border-line py-4">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-2.5 text-sm font-medium text-ink-soft">
            {["Leads", "Pipeline", "AI Intelligence", "Tasks", "Collaboration"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

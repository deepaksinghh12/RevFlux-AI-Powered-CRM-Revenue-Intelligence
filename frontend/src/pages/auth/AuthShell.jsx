import { Sparkles, TrendingUp, Bot, ShieldCheck } from "lucide-react";

/* Split-screen auth layout: marketing panel on the left, form on the right. */
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand / marketing panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        {/* Subtle premium pattern/texture could go here instead of massive gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand-800/40 via-transparent to-transparent opacity-60" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Sparkles className="h-5 w-5 text-brand-300" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">RevFlux</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Intelligent pipeline management.
          </h2>
          <p className="mt-4 max-w-md text-white/70 text-lg">
            RevFlux unifies your leads, contacts and follow-ups — then layers
            AI-powered summaries, email drafts and sales insights on top.
          </p>

          <div className="mt-12 space-y-6">
            {[
              { icon: TrendingUp, title: "Visual Pipeline", text: "Drag-and-drop stages to keep deals moving." },
              { icon: Bot, title: "AI Copilot", text: "Automated lead scoring & instant email drafting." },
              { icon: ShieldCheck, title: "Enterprise Security", text: "Role-based access control and secure JWT auth." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-5 w-5 text-brand-300" />
                </div>
                <div>
                  <h3 className="font-medium text-white/90">{title}</h3>
                  <p className="text-sm text-white/60">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40 font-medium">
          © {new Date().getFullYear()} RevFlux. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 bg-white">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}

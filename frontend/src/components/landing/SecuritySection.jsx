import { ShieldCheck, Lock, Building2, Check, ArrowDown } from "lucide-react";

export function SecuritySection() {
  return (
    <section id="security" className="py-20 bg-ink text-white">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">

          {/* LEFT — Messaging */}
          <div className="lg:w-1/2 shrink-0 mb-10 lg:mb-0">
            <h2 className="font-display text-3xl sm:text-[2.5rem] font-bold leading-tight tracking-tight">
              Built for teams.<br />Designed for control.
            </h2>
            <p className="mt-4 text-base text-white/60 leading-relaxed max-w-md">
              Your CRM data is your most valuable asset. RevFlux enforces strict tenant isolation and role-based access at every layer.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sm">Tenant Isolation</span>
                  <span className="text-white/50 text-sm block">Data segregated by Organization at the database layer.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sm">Modern Auth</span>
                  <span className="text-white/50 text-sm block">Email OTP, Google OAuth, and JWT sessions.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sm">Role-Based Access</span>
                  <span className="text-white/50 text-sm block">Admin, Manager, and Rep permissions enforced on every API.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* RIGHT — Architecture */}
          <div className="lg:w-1/2 flex justify-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-xs">
              <div className="flex flex-col items-center gap-1.5">
                {["USER", "ORGANIZATION", "MEMBERSHIP", "ROLE"].map((label, i) => (
                  <div key={label}>
                    <div className="px-6 py-2.5 rounded border border-white/15 bg-white/5 font-mono text-xs w-52 text-center">
                      {label}
                    </div>
                    {i < 3 && <ArrowDown className="h-4 w-4 text-white/30 mx-auto my-1" />}
                  </div>
                ))}
                <ArrowDown className="h-4 w-4 text-emerald-400 mx-auto my-1" />
                <div className="px-6 py-2.5 rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold w-52 text-center">
                  AUTHORIZED DATA
                </div>
              </div>

              <div className="mt-6 space-y-2 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-2 rounded">
                  <Check className="h-3 w-3" /> GET /api/leads (Manager)
                </div>
                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-2 rounded">
                  <Lock className="h-3 w-3" /> DELETE /api/leads (Rep — Denied)
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

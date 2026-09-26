import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import { Button, Card, Badge } from "../components/ui";
import { PRICING_PLANS } from "../lib/pricingConfig";
import { currency } from "../lib/format";
import { useAuth } from "../context/AuthContext";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" | "annual"

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Header Bar */}
      <header className="border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-ink">RevFlux</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/")}>Go to Workspace</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button onClick={() => navigate("/register")}>Start Free</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <Badge className="bg-brand-50 text-brand-700 mb-4 font-semibold">
          Transparent SaaS Pricing
        </Badge>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Simple plans for sales teams of any size.
        </h1>
        <p className="mt-4 text-base text-ink-soft max-w-2xl mx-auto">
          No hidden fees. Every plan includes AI intelligence, follow-up management, and lead tracking.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-ink font-bold" : "text-ink-soft"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-brand-600 transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                billingCycle === "annual" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium ${billingCycle === "annual" ? "text-ink font-bold" : "text-ink-soft"}`}>
              Annual Billing
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Save 20%
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 transition-all ${
                  plan.popular
                    ? "border-2 border-brand-500 shadow-xl ring-4 ring-brand-500/10"
                    : "border border-line shadow-sm hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase shadow-xs">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="font-display text-xl font-bold text-ink">{plan.name}</h3>
                  <p className="mt-1 text-xs text-ink-soft min-h-8">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold text-ink">
                      {price === 0 ? "₹0" : currency(price)}
                    </span>
                    <span className="text-xs text-ink-soft">/month</span>
                  </div>

                  <ul className="mt-6 space-y-3 border-t border-line pt-6 text-xs text-ink">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "primary" : "outline"}
                    onClick={() => navigate(user ? "/settings" : "/register")}
                  >
                    {plan.ctaText}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

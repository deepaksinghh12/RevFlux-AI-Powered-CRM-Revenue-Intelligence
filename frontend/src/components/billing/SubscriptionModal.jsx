import { useState } from "react";
import { Check, Sparkles, Shield, ArrowRight } from "lucide-react";
import { Dialog, Button, Badge, Spinner } from "../ui";
import { PRICING_PLANS } from "../../lib/pricingConfig";
import { authApi } from "../../lib/services";
import { useAuth } from "../../context/AuthContext";
import { currency } from "../../lib/format";
import { toast } from "sonner";

export function SubscriptionModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || "growth");
  const [submitting, setSubmitting] = useState(false);

  const activePlanId = user?.plan || "free";

  const handleUpgrade = async () => {
    if (selectedPlan === activePlanId) {
      return toast.info(`You are already on the ${selectedPlan.toUpperCase()} plan.`);
    }

    setSubmitting(true);
    try {
      const res = await authApi.subscribe({ plan: selectedPlan });
      toast.success(res.message || "Plan updated!");
      if (res.user) {
        updateUser(res.user);
      }
      onClose();
    } catch (err) {
      toast.error(err?.message || "Subscription update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Upgrade RevFlux Subscription" description="Select a plan tailored to your sales team size">
      <div className="mt-4 space-y-4">
        {/* Current Plan Badge */}
        <div className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs">
          <span className="text-ink-soft">Current Plan:</span>
          <Badge className="bg-brand-50 text-brand-700 font-bold uppercase">
            {activePlanId} Plan
          </Badge>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
          {PRICING_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrent = activePlanId === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20"
                    : "border-line bg-surface hover:border-brand-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-ink">{plan.name}</h4>
                    {isCurrent && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Active</Badge>}
                    {plan.popular && <Badge className="bg-brand-600 text-white text-[10px]">Popular</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{plan.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-base font-bold text-ink">
                    {plan.monthlyPrice === 0 ? "₹0" : currency(plan.monthlyPrice)}
                  </p>
                  <span className="text-[10px] text-ink-soft">/month</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={submitting || selectedPlan === activePlanId}>
            {submitting && <Spinner size="sm" />}
            {selectedPlan === activePlanId ? "Current Plan" : "Confirm & Update Plan"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

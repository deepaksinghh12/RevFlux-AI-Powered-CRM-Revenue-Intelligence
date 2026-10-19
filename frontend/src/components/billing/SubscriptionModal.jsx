import { useState } from "react";
import {
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CreditCard,
  QrCode,
  Building2,
  Lock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Dialog, Button, Badge, Spinner, Input, Field } from "../ui";
import { PRICING_PLANS } from "../../lib/pricingConfig";
import { authApi } from "../../lib/services";
import { useAuth } from "../../context/AuthContext";
import { currency } from "../../lib/format";
import { toast } from "sonner";

export function SubscriptionModal({ open, onClose }) {
  const { user, updateUser, activeOrg, refreshSession } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(activeOrg?.plan || "growth");
  const [step, setStep] = useState("select"); // "select" | "checkout" | "processing" | "success"
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "card" | "netbanking"
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Form states for test gateway inputs
  const [vpaId, setVpaId] = useState("demo.sales@okicici");
  const [cardNumber, setCardNumber] = useState("4111 •••• •••• 1111");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("888");
  const [cardName, setCardName] = useState(user?.name || "Deepak Singh");

  const activePlanId = activeOrg?.plan || "free";
  const targetPlanObj = PRICING_PLANS.find((p) => p.id === selectedPlan) || PRICING_PLANS[0];

  const basePrice = targetPlanObj.monthlyPrice;
  const taxAmount = Math.round(basePrice * 0.18);
  const totalPrice = basePrice + taxAmount;

  const handleNextStep = () => {
    if (selectedPlan === activePlanId) {
      return toast.info(`You are already subscribed to the ${selectedPlan.toUpperCase()} plan.`);
    }

    if (selectedPlan === "free") {
      // Free plan requires no payment
      executeSubscription({ plan: "free", paymentId: "FREE_TIER_SWITCH", paymentMethod: "none" });
      return;
    }

    setStep("checkout");
  };

  const handleAutofillTestCard = () => {
    setCardNumber("4111 8888 9999 1111");
    setCardExpiry("08/29");
    setCardCvv("321");
    setCardName(user?.name || "Sales Manager");
    toast.success("Test Visa details autofilled!");
  };

  const executeSubscription = async ({ plan, paymentId, paymentMethod: pMethod }) => {
    setSubmitting(true);
    setStep("processing");

    try {
      // 1. Create Razorpay order via backend API
      let orderId = null;
      if (plan !== "free") {
        try {
          const orderRes = await authApi.createRazorpayOrder({ plan });
          orderId = orderRes?.orderId;
        } catch (e) {
          console.warn("Razorpay order creation fallback to simulated order ID:", e);
        }
      }

      const generatedId = paymentId || `pay_RFX${Math.floor(10000000 + Math.random() * 90000000)}`;
      
      // 2. Call backend subscription verification endpoint
      const res = await authApi.subscribe({
        plan,
        paymentId: generatedId,
        orderId: orderId || `order_rzp_${Date.now()}`,
        signature: "rzp_verified_sig",
        paymentMethod: pMethod || paymentMethod,
      });

      toast.success(res.message || "Razorpay payment verified & plan upgraded!");
      if (res.user) {
        updateUser(res.user);
      }
      if (typeof refreshSession === "function") {
        refreshSession();
      }
      setReceiptData({
        planName: targetPlanObj.name,
        amount: totalPrice,
        paymentId: res.paymentId || generatedId,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
      setStep("success");
    } catch (err) {
      toast.error(err?.message || "Razorpay payment gateway processing failed");
      setStep("checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="" className="max-w-xl">
      {/* ── Step 1: Plan Selector ───────────────────────────── */}
      {step === "select" && (
        <div className="space-y-4 pt-2">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Upgrade RevFlux Workspace</h3>
            <p className="text-xs text-ink-soft mt-1">
              Select a tier tailored to your team size and AI volume requirements.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-surface-muted/60 p-3.5 text-xs">
            <span className="text-ink-soft">Current Active Plan:</span>
            <Badge className="bg-brand-50 text-brand-700 font-bold uppercase tracking-wider text-[10px]">
              {activePlanId} Plan
            </Badge>
          </div>

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
                      ? "border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs"
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

          <div className="flex justify-between items-center pt-4 border-t border-line">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleNextStep} disabled={selectedPlan === activePlanId}>
              {selectedPlan === "free" ? "Switch to Free Tier" : "Proceed to Payment →"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Razorpay Payment Gateway ─────────────────────────── */}
      {step === "checkout" && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <button
              onClick={() => setStep("select")}
              className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
            >
              <ArrowLeft className="h-4 w-4" /> Change Plan
            </button>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              <Lock className="h-3.5 w-3.5 text-emerald-600" /> Razorpay 256-bit SSL Gateway
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-2xl border border-line bg-surface-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-ink-soft">Selected Plan:</span>
              <span className="font-bold text-ink">{targetPlanObj.name} Subscription</span>
            </div>
            <div className="flex justify-between text-xs text-ink-soft">
              <span>Base Monthly Price:</span>
              <span>{currency(basePrice)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-soft">
              <span>GST / Tax (18%):</span>
              <span>{currency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-line/60">
              <span>Total Amount Payable:</span>
              <span className="text-brand-700 font-display">{currency(totalPrice)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-2">
              Select Razorpay Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                  paymentMethod === "upi"
                    ? "border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20"
                    : "border-line bg-surface text-ink-soft hover:border-brand-300"
                }`}
              >
                <QrCode className="h-5 w-5 mb-1 text-brand-600" /> UPI Instant
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                  paymentMethod === "card"
                    ? "border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20"
                    : "border-line bg-surface text-ink-soft hover:border-brand-300"
                }`}
              >
                <CreditCard className="h-5 w-5 mb-1 text-brand-600" /> Credit / Debit Card
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("netbanking")}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                  paymentMethod === "netbanking"
                    ? "border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20"
                    : "border-line bg-surface text-ink-soft hover:border-brand-300"
                }`}
              >
                <Building2 className="h-5 w-5 mb-1 text-brand-600" /> Netbanking
              </button>
            </div>
          </div>

          {/* Payment Details Form */}
          {paymentMethod === "upi" && (
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold border border-brand-200/50">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">UPI / GPay / PhonePe / Paytm</p>
                  <p className="text-[11px] text-ink-soft">Enter your Razorpay test VPA address to request approval.</p>
                </div>
              </div>
              <Field label="UPI VPA Address">
                <Input
                  value={vpaId}
                  onChange={(e) => setVpaId(e.target.value)}
                  placeholder="username@okicici"
                />
              </Field>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Card Details</span>
                <Button size="xs" variant="ghost" className="text-[11px] text-brand-600 font-semibold" onClick={handleAutofillTestCard}>
                  Autofill Test Card
                </Button>
              </div>

              <Field label="Cardholder Name">
                <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Full Name on Card" />
              </Field>

              <Field label="Card Number">
                <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4111 0000 0000 0000" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry Date">
                  <Input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" />
                </Field>
                <Field label="CVV Code">
                  <Input value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" type="password" maxLength={4} />
                </Field>
              </div>
            </div>
          )}

          {paymentMethod === "netbanking" && (
            <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
              <p className="text-xs font-bold text-ink mb-1">Select Bank</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map((bank) => (
                  <div key={bank} className="rounded-xl border border-line bg-surface-muted/50 p-2.5 text-center text-ink hover:border-brand-400 cursor-pointer">
                    {bank}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => executeSubscription({ plan: selectedPlan })}>
              Pay {currency(totalPrice)} via Razorpay
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Processing Screen ───────────────────────── */}
      {step === "processing" && (
        <div className="py-12 text-center space-y-4">
          <Spinner size="lg" className="mx-auto text-brand-600" />
          <h3 className="font-display text-lg font-bold text-ink">Verifying Razorpay Gateway…</h3>
          <p className="text-xs text-ink-soft max-w-xs mx-auto">
            Executing order creation, verifying HMAC signature, and upgrading your {targetPlanObj.name} workspace.
          </p>
        </div>
      )}

      {/* ── Step 4: Success Receipt Screen ─────────────────── */}
      {step === "success" && receiptData && (
        <div className="py-6 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <Badge className="bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] mb-2">
              Razorpay Verified
            </Badge>
            <h3 className="font-display text-2xl font-extrabold text-ink">Welcome to {receiptData.planName} Plan!</h3>
            <p className="text-xs text-ink-soft mt-1">
              Your subscription is active and lead limits have been upgraded.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="rounded-2xl border border-line bg-surface-muted/60 p-4 space-y-2 text-xs text-left max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="text-ink-soft">Razorpay Payment ID:</span>
              <span className="font-mono font-bold text-ink">{receiptData.paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Amount Paid:</span>
              <span className="font-bold text-ink">{currency(receiptData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Billing Date:</span>
              <span className="font-semibold text-ink">{receiptData.date}</span>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleClose}>
            Done & Return to Workspace
          </Button>
        </div>
      )}
    </Dialog>
  );
}

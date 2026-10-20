import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Lock, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { AuthShell } from "./AuthShell";
import { Button, Field, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../lib/services";

export default function Login() {
  const { login, googleLogin, otpLogin, linkMicrosoft, exchangeMicrosoftCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("password"); // "password" | "otp-request" | "otp-verify" | "link-account"
  const [otpEmail, setOtpEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [linkingEmail, setLinkingEmail] = useState("");
  const [linkingTicket, setLinkingTicket] = useState("");
  const [linkMethod, setLinkMethod] = useState("password"); // "password" | "otp"
  const [linkOtpSent, setLinkOtpSent] = useState(false);
  const [linkCooldown, setLinkCooldown] = useState(0);

  // Safe guard to prevent duplicate code exchange under React StrictMode while allowing new callback codes
  const handledCodesRef = useRef(new Set());

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    let timer;
    if (linkCooldown > 0) {
      timer = setInterval(() => setLinkCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [linkCooldown]);

  // Handle URL query parameters from Microsoft OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const msCode = params.get("ms_code");
    const linkRequired = params.get("link_required");
    const errorParam = params.get("error");

    if (msCode) {
      // Guard against double invocation in React StrictMode
      if (handledCodesRef.current.has(msCode)) {
        return;
      }
      handledCodesRef.current.add(msCode);

      // Immediately remove callback code from browser address bar and history
      window.history.replaceState({}, document.title, location.pathname);
      setSubmitting(true);
      exchangeMicrosoftCode(msCode)
        .then((user) => {
          toast.success(`Welcome, ${user.name.split(" ")[0]} 👋`);
          navigate(location.state?.from?.pathname || "/", { replace: true });
        })
        .catch((err) => {
          toast.error(err.message || "Failed to complete Microsoft sign-in");
        })
        .finally(() => setSubmitting(false));
    } else if (linkRequired === "true") {
      const email = params.get("email") || "";
      const ticket = params.get("ticket") || "";
      window.history.replaceState({}, document.title, location.pathname);
      setLinkingEmail(email);
      setLinkingTicket(ticket);
      setMode("link-account");
      setLinkMethod("password");
      setLinkOtpSent(false);
      toast.info("An existing account with this email was found. Please verify your identity to link your Microsoft account.");
    } else if (errorParam) {
      window.history.replaceState({}, document.title, location.pathname);
      toast.error(decodeURIComponent(errorParam));
    }
  }, [location, exchangeMicrosoftCode, navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setSubmitting(true);
      const user = await googleLogin(credentialResponse.credential);
      toast.success(`Welcome, ${user.name.split(" ")[0]} 👋`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Google login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMicrosoftLogin = () => {
    const rawBaseURL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    const cleanBase = rawBaseURL.replace(/\/+$/, "");
    const baseURL = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
    const returnTo = `${window.location.origin}/login`;
    window.location.href = `${baseURL}/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { email: "", password: "", otp: "", linkPassword: "", linkOtp: "" } });

  const onSubmitPassword = async (data) => {
    setSubmitting(true);
    try {
      const user = await login(data);
      toast.success(`Welcome back, ${user.name.split(" ")[0]} 👋`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestLinkingOtp = async () => {
    if (linkCooldown > 0) return;
    setSubmitting(true);
    try {
      await authApi.requestLinkingOtp({ ticket: linkingTicket });
      setLinkOtpSent(true);
      setLinkCooldown(60);
      toast.success(`Verification code sent to ${linkingEmail}`);
    } catch (err) {
      toast.error(err.message || "Failed to send verification code");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitLinkAccount = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ticket: linkingTicket,
      };

      if (linkMethod === "password") {
        payload.password = data.linkPassword;
      } else {
        payload.otp = data.linkOtp;
      }

      const user = await linkMicrosoft(payload);
      toast.success(`Microsoft account linked! Welcome, ${user.name.split(" ")[0]} 👋`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to link Microsoft account. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpRequest = async (data) => {
    setSubmitting(true);
    try {
      await authApi.requestOtp({ email: data.email });
      setOtpEmail(data.email);
      setMode("otp-verify");
      setCooldown(60); // 60s cooldown
      toast.success("Verification code sent if email exists.");
    } catch (err) {
      toast.error(err.message || "Failed to request OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerify = async (data) => {
    setSubmitting(true);
    try {
      const user = await otpLogin({ email: otpEmail, otp: data.otp });
      toast.success(`Welcome, ${user.name.split(" ")[0]} 👋`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid or expired verification code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setSubmitting(true);
    try {
      await authApi.requestOtp({ email: otpEmail });
      setCooldown(60);
      toast.success("A new verification code has been sent.");
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          {mode === "otp-verify"
            ? "Check your email"
            : mode === "link-account"
            ? "Link your Microsoft account"
            : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {mode === "otp-verify"
            ? `We sent a 6-digit code to ${otpEmail}`
            : mode === "link-account"
            ? "Confirm your existing RevFlux credentials to complete account linking"
            : "Sign in to your RevFlux workspace."}
        </p>
      </div>

      {mode === "password" && (
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="mt-8 space-y-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google login failed")}
              theme="outline"
              size="large"
              text="signin_with"
              width="100%"
            />

            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition hover:bg-surface hover:border-ink/20 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Sign in with Microsoft</span>
            </button>
          </div>

          <div className="relative mt-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-ink-soft">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmitPassword)} className="mt-8 space-y-4">
            <Field label="Email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register("password", { required: "Password is required" })}
                />
              </div>
            </Field>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign in
            </Button>
          </form>

          <button
            onClick={() => setMode("otp-request")}
            className="mt-4 w-full text-sm font-medium text-brand-700 hover:underline"
          >
            Use passwordless login (OTP)
          </button>
        </div>
      )}

      {mode === "link-account" && (
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-900">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <span>Security Verification Required</span>
            </div>
            <p className="mt-1 text-xs text-brand-800">
              An account for <strong className="font-mono">{linkingEmail}</strong> already exists on RevFlux. To link your Microsoft identity securely, please verify your account.
            </p>
          </div>

          {/* Linking Method Tabs */}
          <div className="mt-5 flex border-b border-line text-sm">
            <button
              type="button"
              onClick={() => {
                setLinkMethod("password");
                setValue("linkOtp", "");
              }}
              className={`pb-2.5 px-4 font-medium transition border-b-2 ${
                linkMethod === "password"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Verify with Password
            </button>
            <button
              type="button"
              onClick={() => {
                setLinkMethod("otp");
                setValue("linkPassword", "");
                if (!linkOtpSent) {
                  handleRequestLinkingOtp();
                }
              }}
              className={`pb-2.5 px-4 font-medium transition border-b-2 ${
                linkMethod === "otp"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Verify with Email Code
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmitLinkAccount)} className="mt-5 space-y-4">
            <Field label="Account Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  type="email"
                  value={linkingEmail}
                  disabled
                  className="pl-9 bg-surface text-ink-soft cursor-not-allowed"
                />
              </div>
            </Field>

            {linkMethod === "password" && (
              <Field label="RevFlux Password" error={errors.linkPassword?.message}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    {...register("linkPassword", {
                      required: linkMethod === "password" ? "Password is required to link accounts" : false,
                    })}
                  />
                </div>
              </Field>
            )}

            {linkMethod === "otp" && (
              <div>
                <Field label="6-Digit Verification Code" error={errors.linkOtp?.message}>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pl-9 text-center tracking-widest text-lg font-mono"
                      {...register("linkOtp", {
                        required: linkMethod === "otp" ? "Verification code is required" : false,
                        pattern: {
                          value: /^\d{6}$/,
                          message: "Code must be 6 digits",
                        },
                      })}
                    />
                  </div>
                </Field>

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRequestLinkingOtp}
                    disabled={linkCooldown > 0 || submitting}
                    className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
                  >
                    {linkCooldown > 0 ? `Resend code in ${linkCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Verify & Link Microsoft Account
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode("password");
                setLinkingTicket("");
                setLinkingEmail("");
                setLinkOtpSent(false);
              }}
              className="mt-4 flex items-center justify-center w-full text-sm font-medium text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel and return to sign in
            </button>
          </form>
        </div>
      )}

      {mode === "otp-request" && (
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <form onSubmit={handleSubmit(handleOtpRequest)} className="mt-8 space-y-4">
            <Field label="Email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
            </Field>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Send verification code
            </Button>

            <button
              type="button"
              onClick={() => setMode("password")}
              className="mt-4 flex items-center justify-center w-full text-sm font-medium text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to password login
            </button>
          </form>
        </div>
      )}

      {mode === "otp-verify" && (
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <form onSubmit={handleSubmit(handleOtpVerify)} className="mt-8 space-y-4">
            <Field label="6-digit code" error={errors.otp?.message}>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className="pl-9 text-center tracking-widest text-lg font-mono"
                  {...register("otp", { 
                    required: "Code is required",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Code must be 6 digits"
                    }
                  })}
                />
              </div>
            </Field>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Verify and sign in
            </Button>

            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || submitting}
                className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>

              <button
                type="button"
                onClick={() => setMode("otp-request")}
                className="flex items-center text-sm font-medium text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change email
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

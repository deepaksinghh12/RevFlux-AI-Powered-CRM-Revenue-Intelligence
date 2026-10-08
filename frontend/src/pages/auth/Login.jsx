import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { AuthShell } from "./AuthShell";
import { Button, Field, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../lib/services";

export default function Login() {
  const { login, googleLogin, otpLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("password"); // "password" | "otp-request" | "otp-verify"
  const [otpEmail, setOtpEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: "", password: "", otp: "" } });

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
          {mode === "otp-verify" ? "Check your email" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {mode === "otp-verify"
            ? `We sent a 6-digit code to ${otpEmail}`
            : "Sign in to your RevFlux workspace."}
        </p>
      </div>

      {mode === "password" && (
        <div className="animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="mt-8">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google login failed")}
              theme="outline"
              size="large"
              text="signin_with"
              width="100%"
            />
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Demo() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const launchDemo = async () => {
      try {
        toast.loading("Preparing demo workspace...", { id: "demo" });
        await login({ email: "admin@gmail.com", password: "admin123" });
        if (mounted) {
          toast.success("Welcome to the RevFlux Demo Workspace!", { id: "demo" });
          navigate("/");
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to launch demo workspace");
          toast.error("Could not launch demo account", { id: "demo" });
        }
      }
    };

    launchDemo();

    return () => {
      mounted = false;
    };
  }, [login, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-3xl bg-surface p-10 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-ink">
          Launching RevFlux Demo
        </h2>
        <p className="mt-2 text-xs text-ink-soft">
          Loading realistic sample deals, pipeline metrics, and AI risk scores...
        </p>

        {error ? (
          <div className="mt-6 rounded-xl bg-rose-50 p-3 text-xs text-rose-600">
            {error}
          </div>
        ) : (
          <div className="mt-8 flex justify-center">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    </div>
  );
}

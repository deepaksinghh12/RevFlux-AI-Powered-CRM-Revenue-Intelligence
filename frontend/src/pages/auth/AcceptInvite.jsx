import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../lib/services";
import { Button, Card } from "../../components/ui";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import api from "../../lib/api";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [status, setStatus] = useState("loading"); // loading, success, error, requires_auth
  const [error, setError] = useState(null);
  const [orgName, setOrgName] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No invitation token provided.");
      return;
    }

    if (!user) {
      // User is not logged in. Save token and redirect to login.
      localStorage.setItem("PENDING_INVITE_TOKEN", token);
      setStatus("requires_auth");
      return;
    }

    // Process token
    const accept = async () => {
      try {
        const res = await api.post("/auth/accept-invite", { token });
        setOrgName(res.message.replace("You have successfully joined ", ""));
        updateUser(res.user); // updates workspaces and active org
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err.message || "Failed to accept invitation");
      }
    };

    accept();
  }, [token, user, updateUser]);

  if (status === "requires_auth") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-canvas">
        <Card className="max-w-md w-full p-8 text-center shadow-xl border-line">
          <h2 className="text-2xl font-display font-bold text-ink mb-4">Almost there!</h2>
          <p className="text-ink-soft mb-6">
            You need to log in or create an account to accept this invitation.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/login")} className="w-full">
              Log in to accept
            </Button>
            <Button variant="outline" onClick={() => navigate("/register")} className="w-full bg-surface">
              Create a new account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-canvas">
      <Card className="max-w-md w-full p-8 text-center shadow-xl border-line">
        {status === "loading" && (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-ink">Verifying invitation...</h2>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ink mb-2">Invitation Accepted!</h2>
            <p className="text-ink-soft mb-8">
              {orgName ? `Welcome to ${orgName}` : "You have successfully joined the workspace."}
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ink mb-2">Invalid Invitation</h2>
            <p className="text-ink-soft mb-8">
              {error || "This invitation link is invalid or has expired."}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full bg-surface">
              Return to Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

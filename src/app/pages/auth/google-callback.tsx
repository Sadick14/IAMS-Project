import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router";
import { useAppContext } from "../../lib/context";
import { normalizeApiUser } from "../../lib/context";
import { apiClient, setApiAuthToken } from "../../lib/api-client";
import { getRoutePrefix } from "../../services/auth-service";
import { GraduationCap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type State = "processing" | "success" | "error";

export function GoogleCallbackPage() {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<State>("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Backend may pass the token under any of these param names
    const token =
      searchParams.get("token") ??
      searchParams.get("access_token") ??
      searchParams.get("auth_token") ??
      "";

    if (!token) {
      const backendError = searchParams.get("error") ?? searchParams.get("message");
      setState("error");
      setErrorMsg(
        backendError ?? "Google sign-in did not return an access token. Please try again."
      );
      return;
    }

    setApiAuthToken(token);

    apiClient.me().then((res) => {
      if (!res.success || !res.data) {
        setApiAuthToken(null);
        setState("error");
        setErrorMsg(res.message ?? "Could not retrieve your account details. Please try signing in again.");
        return;
      }
      const rawUser = (res.data as any).user ?? res.data;
      const user = normalizeApiUser(rawUser);
      setUser(user);
      setState("success");
      toast.success(`Welcome, ${user.name}!`);
      // Redirect to the page they were trying to access, or dashboard if none
      const fromLocation = (location.state as any)?.from?.pathname || getRoutePrefix(user.role);
      setTimeout(() => navigate(fromLocation, { replace: true }), 1000);
    }).catch(() => {
      setApiAuthToken(null);
      setState("error");
      setErrorMsg("Could not reach the server. Please check your connection and try again.");
    });
  // Run once on mount — URL params won't change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1>HTU Attachment System</h1>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 space-y-4 text-center">
          {state === "processing" && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-medium" style={{ fontSize: "0.95rem" }}>Completing sign in…</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.82rem" }}>
                  Finishing your Google authentication.
                </p>
              </div>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <div>
                <p className="font-medium" style={{ fontSize: "0.95rem" }}>Signed in!</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.82rem" }}>
                  Redirecting to your dashboard…
                </p>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="w-10 h-10 text-red-500 mx-auto" />
              <div>
                <p className="font-medium" style={{ fontSize: "0.95rem" }}>Sign in failed</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.82rem" }}>
                  {errorMsg}
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontSize: "0.85rem" }}
              >
                Try again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

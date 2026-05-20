import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppContext } from "../../lib/context";
import { authenticateByEmail, authenticateByToken, isHTUEmail, getRoutePrefix } from "../../services/auth-service";
import { ensureDemoStudentApplication } from "../../lib/store";
import { GraduationCap, LogIn, Key, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { preloadDashboard } from "../../lib/preload";

export function LoginPage() {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"sso" | "magic">("sso");
  const [error, setError] = useState("");

  const handleGoogleSSO = () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your HTU email address.");
      return;
    }

    if (!isHTUEmail(email)) {
      setError("Only @htu.edu.gh and @st.htu.edu.gh email addresses are allowed.");
      return;
    }

    const user = authenticateByEmail(email);
    if (!user) {
      setError("Account not found. Contact the Central Liaison Office for access.");
      return;
    }
    setUser(user);
    if (user.role === "student" && user.studentId) ensureDemoStudentApplication(user.studentId);
    preloadDashboard(user.role);
    toast.success(`Welcome, ${user.name}!`);
    navigate(getRoutePrefix(user.role), { replace: true });
  };

  const handleMagicLink = () => {
    setError("");

    if (!token.trim()) {
      setError("Please enter the access token from your email.");
      return;
    }

    const user = authenticateByToken(token);
    if (!user) {
      setError("Invalid or expired token. Contact the student or DLO to resend.");
      return;
    }
    setUser(user);
    if (user.role === "student" && user.studentId) ensureDemoStudentApplication(user.studentId);
    preloadDashboard(user.role);
    toast.success(`Welcome, ${user.name}!`);
    navigate(getRoutePrefix(user.role), { replace: true });
  };

  // Quick login buttons for demo
  const demoLogins = [
    { label: "CLO (Super Admin)", email: "k.asante@htu.edu.gh", role: "clo" as const },
    { label: "DLO (Dept. Liaison)", email: "e.mensah@htu.edu.gh", role: "dlo" as const },
    { label: "Academic Supervisor", email: "a.osei@htu.edu.gh", role: "academic" as const },
    { label: "HOD", email: "y.mensah@htu.edu.gh", role: "hod" as const },
    { label: "Student Demo", email: "john.doe@st.htu.edu.gh", role: "student" as const },
    { label: "Industry Supervisor", token: "sup-tok-abc123", role: "supervisor" as const },
  ];

  const handleDemoLogin = (demo: (typeof demoLogins)[number]) => {
    if (demo.token) {
      const user = authenticateByToken(demo.token);
      if (user) {
        setUser(user);
        if (user.role === "student" && user.studentId) ensureDemoStudentApplication(user.studentId);
        preloadDashboard(user.role);
        toast.success(`Welcome, ${user.name}!`);
        navigate(getRoutePrefix(user.role), { replace: true });
      }
    } else if (demo.email) {
      const user = authenticateByEmail(demo.email);
      if (user) {
        setUser(user);
        if (user.role === "student" && user.studentId) ensureDemoStudentApplication(user.studentId);
        preloadDashboard(user.role);
        toast.success(`Welcome, ${user.name}!`);
        navigate(getRoutePrefix(user.role), { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1>HTU Attachment System</h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
              Industrial Attachment Management Portal
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-2xl p-6 space-y-5">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-muted p-1 gap-1">
            <button
              onClick={() => setMode("sso")}
              className={`flex-1 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                mode === "sso" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "0.85rem" }}
            >
              <LogIn className="w-4 h-4" /> HTU Login
            </button>
            <button
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                mode === "magic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "0.85rem" }}
            >
              <Key className="w-4 h-4" /> Supervisor Access
            </button>
          </div>

          {mode === "sso" ? (
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGoogleSSO()}
                  placeholder="you@htu.edu.gh"
                  className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-input-background"
                  style={{ fontSize: "0.85rem" }}
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>
                  Use your @htu.edu.gh or @st.htu.edu.gh account
                </p>
              </div>
              <button
                onClick={handleGoogleSSO}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{ fontSize: "0.85rem" }}
              >
                <LogIn className="w-4 h-4" /> Sign in with Google SSO
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Access Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                  placeholder="Enter your magic link token"
                  className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-input-background"
                  style={{ fontSize: "0.85rem" }}
                />
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>
                  Industry supervisors: check your email for the access token
                </p>
              </div>
              <button
                onClick={handleMagicLink}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{ fontSize: "0.85rem" }}
              >
                <Key className="w-4 h-4" /> Access Portal
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-700" style={{ fontSize: "0.8rem" }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Demo Quick Login */}
        <div className="bg-card rounded-2xl p-4 space-y-3">
          <p className="text-muted-foreground text-center" style={{ fontSize: "0.75rem" }}>
            Demo Quick Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoLogins.map((demo) => (
              <button
                key={demo.label}
                onClick={() => handleDemoLogin(demo)}
                className="px-3 py-2 border border-border rounded-lg hover:bg-accent hover:border-primary/30 transition-colors text-left"
                style={{ fontSize: "0.8rem" }}
              >
                <span className="block text-foreground">{demo.label}</span>
                <span className="block text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                  {demo.email || `Token: ${demo.token}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
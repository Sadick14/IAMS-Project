import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export function GlobalError() {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  console.error("Global routing error:", error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        <div className="flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-6">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-500" />
          </div>
        </div>
        <div className="p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            We encountered an unexpected error. Don't worry, you can try again or return to your dashboard.
          </p>
          
          {error?.message && (
            <div className="mb-6 rounded-lg bg-muted p-3 text-left">
              <p className="text-xs font-mono text-muted-foreground break-words">
                {error.status ? `${error.status} - ` : ""}
                {error.statusText || error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
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
                An unexpected error occurred while rendering the page. Please try again.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 rounded-lg bg-muted p-3 text-left">
                  <p className="text-xs font-mono text-muted-foreground break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={this.handleReload}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleHome}
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

    return this.props.children;
  }
}

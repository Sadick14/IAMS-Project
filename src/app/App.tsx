import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProvider } from "./lib/context";
import { Toaster } from "sonner";
import { NotificationPoller } from "./components/notification-poller";
import { ErrorBoundary } from "./components/error-boundary";
import { InstallPrompt } from "./components/install-prompt";
import { registerServiceWorker } from "./lib/pwa-utils";

// Suppress a known recharts 2.15.x dev-only warning where its internal
// CategoricalChartWrapper renders children with duplicate `null` keys.
// The warning is harmless and has no fix at the consumer level.
if (typeof window !== "undefined") {
  const origWarn = console.warn;
  const origError = console.error;
  const isRechartsKeyWarning = (args: unknown[]) => {
    if (typeof args[0] !== "string") return false;
    return args[0].includes("Encountered two children with the same key");
  };
  console.warn = (...args: unknown[]) => {
    if (isRechartsKeyWarning(args)) return;
    origWarn(...(args as []));
  };
  console.error = (...args: unknown[]) => {
    if (isRechartsKeyWarning(args)) return;
    origError(...(args as []));
  };
}

export default function App() {
  useEffect(() => {
    // Register service worker for PWA functionality
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <NotificationPoller />
        <InstallPrompt />
        <Toaster position="top-right" richColors />
        <RouterProvider router={router} />
      </AppProvider>
    </ErrorBoundary>
  );
}

/**
 * Register the Service Worker for PWA functionality
 */
export async function registerServiceWorker() {
  // Check if Service Workers are supported
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[PWA] Service Worker registered:", registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New service worker available");
            // Show update available notification if needed
          }
        });
      }
    });
  } catch (error) {
    console.error("[PWA] Service Worker registration failed:", error);
  }
}

/**
 * Unregister Service Worker (for logout or debugging)
 */
export async function unregisterServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log("[PWA] Service Worker unregistered");
    }
  } catch (error) {
    console.error("[PWA] Failed to unregister Service Worker:", error);
  }
}

/**
 * Check if the app is installed as PWA
 */
export function isPWAInstalled(): boolean {
  // Check if running as standalone PWA
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  return isStandalone;
}

/**
 * Check if the app is running on iOS as PWA
 */
export function isIOSPWA(): boolean {
  return (
    (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")) &&
    (window.navigator as any).standalone === true
  );
}

/**
 * Get app version from service worker
 */
export async function getAppVersion(): Promise<string | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration && registration.active) {
    const response = await fetch("/app-version.json");
    if (response.ok) {
      const data = await response.json();
      return data.version;
    }
  }
  return null;
}

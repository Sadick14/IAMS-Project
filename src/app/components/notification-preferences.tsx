import { useState, useEffect } from "react";
import { Bell, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  areBrowserNotificationsEnabled,
  isBrowserNotificationSupported,
  isPushConfigured,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  setBrowserNotificationsEnabled,
} from "../lib/push-notifications";

export function NotificationPreferences() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission());
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const browserSupported = isBrowserNotificationSupported();
  const pushConfigured = isPushConfigured();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    const subscribed = await isSubscribedToPushNotifications();
    const enabled = await areBrowserNotificationsEnabled();
    setIsSubscribed(subscribed);
    setBrowserEnabled(enabled);
    setPermission(getNotificationPermission());
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    try {
      if (browserEnabled || isSubscribed) {
        const success = await unsubscribeFromPushNotifications();
        if (success || !isSubscribed) {
          setIsSubscribed(false);
          setBrowserEnabled(false);
          toast.success("Push notifications disabled for this browser");
        }
      } else {
        const nextPermission = await requestNotificationPermission();
        setPermission(nextPermission);

        if (nextPermission !== "granted") {
          toast.error("Notification permission was not granted");
          return;
        }

        setBrowserEnabled(true);
        setBrowserNotificationsEnabled(true);

        if (!pushConfigured) {
          toast.success("Browser notifications enabled. Server push needs a VAPID key.");
          return;
        }

        const subscription = await subscribeToPushNotifications();
        if (subscription || (await areBrowserNotificationsEnabled())) {
          setIsSubscribed(!!subscription);
          toast.success("Push notifications enabled! You'll receive updates.");
        } else {
          toast.error("Browser permission is enabled, but push subscription failed");
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast.error("Failed to update notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!browserEnabled && permission !== "granted") {
      toast.error("Please enable notifications first");
      return;
    }

    setIsSendingTest(true);
    try {
      await sendTestNotification();
      toast.success("Test notification sent!");
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Failed to send test notification");
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notification Permission Status */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Push Notifications</h3>
            <p className="text-muted-foreground text-sm">
              {!browserSupported
                ? "This browser does not support service-worker notifications."
                : permission === "granted"
                ? "You'll receive notifications about logbooks, attendance, grades, and announcements."
                : permission === "denied"
                ? "Notifications are blocked. Enable them in your browser settings to receive updates."
                : "Enable notifications to stay updated with important information."}
            </p>
          </div>
        </div>

        {/* Permission Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          {!browserSupported ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700 dark:text-red-400">
                Not supported
              </span>
            </>
          ) : permission === "granted" ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">
                Permission granted
              </span>
            </>
          ) : permission === "denied" ? (
            <>
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700 dark:text-red-400">
                Permission blocked
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-400">
                Permission not requested
              </span>
            </>
          )}
        </div>

        {/* Subscription Status */}
        <div className="flex items-center gap-2 text-sm">
          {pushConfigured && isSubscribed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">
                Subscribed to notifications
              </span>
            </>
          ) : browserEnabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-400">
                Browser notifications enabled
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Not subscribed to notifications
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleToggleNotifications}
            disabled={isLoading || permission === "denied" || !browserSupported}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              browserEnabled || isSubscribed
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                : "bg-primary text-primary-foreground hover:opacity-90"
            } disabled:opacity-50`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {browserEnabled || isSubscribed ? "Disable Notifications" : "Enable Notifications"}
          </button>

          {browserEnabled && (
            <button
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingTest && <Loader2 className="w-4 h-4 animate-spin" />}
              Test Notification
            </button>
          )}
        </div>

        {/* Info Box */}
        {permission === "denied" && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            To enable notifications, please change your browser settings:
            <div className="mt-2 text-xs space-y-1">
              <div>
                <strong>Chrome/Edge:</strong> Settings → Privacy → Site Settings →
                Notifications
              </div>
              <div>
                <strong>Firefox:</strong> Settings → Privacy → Permissions →
                Notifications
              </div>
              <div>
                <strong>Safari:</strong> Preferences → Websites → Notifications
              </div>
            </div>
          </div>
        )}
        {!pushConfigured && permission === "granted" && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
            Browser notifications are enabled. To receive true server push while the app is closed,
            configure <code className="px-1 py-0.5 rounded bg-background">VITE_VAPID_PUBLIC_KEY</code>.
          </div>
        )}
      </div>

      {/* What You'll Get Section */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3">You'll receive notifications for:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Logbook status changes (submitted, approved, rejected)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Attendance updates and check-in confirmations
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Grade announcements and evaluation results
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Important announcements from DLO/CLO
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Direct messages from supervisors
          </li>
        </ul>
      </div>
    </div>
  );
}

import { useAppContext } from "../lib/context";
import { useNotifications } from "../lib/hooks";

/**
 * Mounts once in App.tsx to keep notifications fresh across the entire app.
 * Runs a 30-second poll cycle and syncs results to the store so the dashboard
 * badge and communications page stay live. Fires toast popups when genuinely
 * new unread items arrive.
 */
export function NotificationPoller() {
  const { user } = useAppContext();
  // Only poll when a user is authenticated
  useNotifications(!!user);
  return null;
}

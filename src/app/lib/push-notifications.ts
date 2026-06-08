/**
 * Push Notifications utilities for PWA
 * Handles subscription, permission requests, and notification management
 */

import { getApiAuthToken, getApiUrl } from "./api-client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("[Push] Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("[Push] Notification permission:", permission);
    return permission;
  } catch (error) {
    console.error("[Push] Failed to request notification permission:", error);
    return "denied";
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<NotificationSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.warn("[Push] Push notifications not supported");
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    console.warn("[Push] Notification permission not granted");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
        ? (urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource)
        : undefined,
    });

    console.log("[Push] Subscribed to push notifications:", subscription);

    // Send subscription to backend (when API is ready)
    await sendSubscriptionToBackend(subscription);

    // Save subscription to localStorage as backup
    localStorage.setItem(
      "push_subscription",
      JSON.stringify(subscription.toJSON())
    );

    return subscription.toJSON() as NotificationSubscription;
  } catch (error) {
    console.error("[Push] Failed to subscribe to push notifications:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem("push_subscription");
      console.log("[Push] Unsubscribed from push notifications");
      return true;
    }
  } catch (error) {
    console.error("[Push] Failed to unsubscribe from push notifications:", error);
  }

  return false;
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<NotificationSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      return subscription.toJSON() as NotificationSubscription;
    }

    // Check localStorage as fallback
    const stored = localStorage.getItem("push_subscription");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("[Push] Failed to get push subscription:", error);
    return null;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isSubscribedToPushNotifications(): Promise<boolean> {
  const subscription = await getPushSubscription();
  return !!subscription;
}

/**
 * Send subscription to backend
 */
async function sendSubscriptionToBackend(
  subscription: PushSubscription
): Promise<void> {
  try {
    const subscriptionJson = subscription.toJSON();

    const response = await fetch(getApiUrl("/api/v1/push/subscribe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiAuthToken()}`,
      },
      body: JSON.stringify(subscriptionJson),
    });

    if (!response.ok) {
      throw new Error("Failed to save push subscription on backend");
    }

    console.log("[Push] Subscription saved to backend");
  } catch (error) {
    console.warn("[Push] Could not send subscription to backend:", error);
    // Don't throw — subscription is still valid locally
  }
}

/**
 * Send a test notification (for debugging)
 */
export async function sendTestNotification(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Create a test notification through the service worker
    registration.active?.postMessage({
      type: "SHOW_NOTIFICATION",
      notification: {
        title: "IAMS Notification",
        options: {
          body: "This is a test notification from IAMS",
          icon: "/logo-192.png",
          badge: "/logo-192.png",
          tag: "test-notification",
          requireInteraction: false,
        },
      },
    });

    console.log("[Push] Test notification sent");
  } catch (error) {
    console.error("[Push] Failed to send test notification:", error);
  }
}

/**
 * Convert VAPID public key from base64
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

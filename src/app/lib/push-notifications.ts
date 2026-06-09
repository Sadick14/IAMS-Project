/// <reference types="vite/client" />

/**
 * Push Notifications utilities for PWA
 * Handles subscription, permission requests, and notification management
 */

import { getApiAuthToken, getApiUrl } from "./api-client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
const BROWSER_NOTIFICATIONS_ENABLED_KEY = "iams_browser_notifications_enabled";

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
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isBrowserNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window
  );
}

export function isPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.trim().length > 0;
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BROWSER_NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {}
}

function getBrowserNotificationsPreference(): boolean {
  try {
    return localStorage.getItem(BROWSER_NOTIFICATIONS_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
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

  if (!isPushConfigured()) {
    console.warn("[Push] VITE_VAPID_PUBLIC_KEY is not configured; server push subscription skipped");
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    console.warn("[Push] Notification permission not granted");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await sendSubscriptionToBackend(existingSubscription);
      setBrowserNotificationsEnabled(true);
      localStorage.setItem("push_subscription", JSON.stringify(existingSubscription.toJSON()));
      return existingSubscription.toJSON() as NotificationSubscription;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    console.log("[Push] Subscribed to push notifications:", subscription);

    // Send subscription to backend (when API is ready)
    await sendSubscriptionToBackend(subscription);
    setBrowserNotificationsEnabled(true);

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
    if (!isPushNotificationSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }
    localStorage.removeItem("push_subscription");
    setBrowserNotificationsEnabled(false);
    console.log("[Push] Unsubscribed from push notifications");
    return true;
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
    if (!isPushNotificationSupported()) return null;

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
  if (!isPushConfigured()) return false;

  const subscription = await getPushSubscription();
  return !!subscription;
}

export async function areBrowserNotificationsEnabled(): Promise<boolean> {
  return (
    isBrowserNotificationSupported() &&
    getBrowserNotificationsPreference() &&
    getNotificationPermission() === "granted"
  );
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
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission is not granted");
    }

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification("IAMS Notification", {
      body: "This is a test notification from IAMS",
      icon: "/logo-192.png",
      badge: "/logo-192.png",
      tag: "test-notification",
      requireInteraction: false,
      data: {
        url: "/",
      },
    });

    console.log("[Push] Test notification sent");
  } catch (error) {
    console.error("[Push] Failed to send test notification:", error);
    throw error;
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
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

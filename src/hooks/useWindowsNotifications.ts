"use client";

import { useCallback, useEffect, useState } from "react";

export function useWindowsNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("service worker registration failed", error);
    });
  }, []);

  const ensurePermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    if (Notification.permission === "granted") {
      return "granted";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback(async (title: string, body: string): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission !== "granted") {
      return false;
    }

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, {
            body,
            tag: `${title}-${Date.now()}`,
          });
          return true;
        }
      }
      new Notification(title, { body });
      return true;
    } catch (error) {
      console.error("show notification failed", error);
      return false;
    }
  }, []);

  return {
    permission,
    ensurePermission,
    showNotification,
  };
}

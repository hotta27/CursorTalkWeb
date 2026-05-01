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

  const showNotification = useCallback(
    (title: string, body: string) => {
      void (async () => {
        const result = await ensurePermission();
        if (result !== "granted") {
          return;
        }

        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification(title, {
              body,
              tag: `${title}-${Date.now()}`,
            });
            return;
          }
        }
        new Notification(title, { body });
      })().catch((error) => {
        console.error("show notification failed", error);
      });
    },
    [ensurePermission],
  );

  return {
    permission,
    ensurePermission,
    showNotification,
  };
}

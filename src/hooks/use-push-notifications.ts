import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/lib/firebase";

// Helper: set badge if supported
function setBadge(count: number) {
  if ("setAppBadge" in navigator) {
    // @ts-ignore
    navigator.setAppBadge(count);
  }
}

function clearBadge() {
  if ("clearAppBadge" in navigator) {
    // @ts-ignore
    navigator.clearAppBadge();
  }
}

export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;
    if (!app) return;

    let messaging: any = null;
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('Firebase messaging not supported in this environment:', e);
      return;
    }
    if (!messaging) return;

    // Only request permission on user gesture, not automatically
    const requestNotificationPermission = async () => {
      try {
        if (Notification.permission === 'default') {
          // Don't auto-request, wait for user interaction
          console.log('Notification permission not yet requested');
          return;
        }
        
        if (Notification.permission === "granted") {
          const currentToken = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
          });
          if (currentToken) {
            console.log("FCM token:", currentToken);
          }
        }
      } catch (err: any) {
        if (err.code === 'messaging/unsupported-browser') {
          console.warn('Firebase Messaging not supported in this browser.');
        } else {
          console.warn("Notification setup skipped:", err.message);
        }
      }
    };
    
    requestNotificationPermission();

    // Foreground notification handler
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Push notification received:", payload);
      setBadge(1);
    });

    // Optionally clear badge on focus
    const handleFocus = () => clearBadge();
    window.addEventListener("focus", handleFocus);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}

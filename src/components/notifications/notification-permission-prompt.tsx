"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

export default function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show prompt if notifications are supported and permission is default
    if (typeof window !== "undefined" && 
        "Notification" in window && 
        Notification.permission === "default") {
      // Delay showing the prompt a bit so it's not immediate
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notification permission granted");
      }
    } catch (error) {
      console.warn("Failed to request notification permission:", error);
    } finally {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-sm">Enable Notifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get notified about new leads and important updates
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowPrompt(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPrompt(false)}
          className="flex-1"
        >
          Later
        </Button>
        <Button
          size="sm"
          onClick={requestPermission}
          className="flex-1"
        >
          Enable
        </Button>
      </div>
    </div>
  );
}

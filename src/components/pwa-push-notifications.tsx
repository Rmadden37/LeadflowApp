"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeMessaging, getMessagingToken, addForegroundMessageListener } from '@/lib/firebase-messaging-manager';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Check, X } from 'lucide-react';

interface PushNotificationManagerProps {
  showSetupCard?: boolean;
  autoRequestPermission?: boolean;
}

export function PushNotificationManager({ 
  showSetupCard = false, 
  autoRequestPermission = false 
}: PushNotificationManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [messagingManager, setMessagingManager] = useState<any>(null);

  useEffect(() => {
    // Check initial notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;

    const initializeManager = async () => {
      try {
        console.log('🔔 PWA: Initializing push notifications for user:', user.uid);
        
        // Initialize the messaging manager
        const manager = initializeMessaging({
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
          serviceWorkerPath: '/firebase-messaging-sw.js',
          retryAttempts: 3,
          tokenRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
        });

        setMessagingManager(manager);

        // Setup foreground message listener
        const unsubscribe = addForegroundMessageListener((payload) => {
          console.log('📱 PWA: Foreground message received:', payload);
          
          // Show iOS-style in-app notification
          if (payload.notification) {
            toast({
              title: payload.notification.title || 'New Notification',
              description: payload.notification.body || 'You have a new message',
              duration: 5000,
            });
          }

          // Update badge count
          setBadgeCount(1);
        });

        // Auto-request permission if enabled and not already decided
        if (autoRequestPermission && permission === 'default') {
          await requestNotificationPermission();
        }

        return unsubscribe;
      } catch (error) {
        console.error('❌ PWA: Failed to initialize push notifications:', error);
      }
    };

    initializeManager();
  }, [user, isSupported, autoRequestPermission, permission, toast]);

  const setBadgeCount = (count: number) => {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count).catch((error: any) => {
        console.warn('Could not set badge count:', error);
      });
    }
  };

  const clearBadge = () => {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch((error: any) => {
        console.warn('Could not clear badge:', error);
      });
    }
  };

  const requestNotificationPermission = async () => {
    if (!user || !messagingManager) return;

    setIsInitializing(true);

    try {
      // Request permission using the messaging manager
      const newPermission = await messagingManager.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        // Get FCM token
        const fcmToken = await getMessagingToken();
        
        if (fcmToken) {
          setToken(fcmToken);

          // Store token in Firestore
          await setDoc(doc(db, 'userTokens', user.uid), {
            fcmToken,
            userId: user.uid,
            enabled: true,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
            },
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          }, { merge: true });

          toast({
            title: '🔔 Notifications Enabled',
            description: 'You\'ll now receive push notifications for lead assignments and important updates.',
            duration: 5000,
          });

          console.log('✅ PWA: Push notifications enabled successfully');
        }
      } else {
        toast({
          title: 'Notifications Disabled',
          description: 'You can enable notifications later in your browser settings.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('❌ PWA: Failed to setup notifications:', error);
      toast({
        title: 'Setup Failed',
        description: 'Could not setup push notifications. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const disableNotifications = async () => {
    if (!user) return;

    try {
      // Update Firestore to disable notifications for this user
      await setDoc(doc(db, 'userTokens', user.uid), {
        enabled: false,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      setToken(null);
      toast({
        title: 'Notifications Disabled',
        description: 'Push notifications have been disabled for this device.',
      });
    } catch (error) {
      console.error('❌ PWA: Failed to disable notifications:', error);
      toast({
        title: 'Error',
        description: 'Could not disable notifications. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Clear badge when component unmounts or user focuses
  useEffect(() => {
    const handleFocus = () => clearBadge();
    const handleVisibilityChange = () => {
      if (!document.hidden) clearBadge();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isSupported) {
    return null; // Don't render if push notifications aren't supported
  }

  // If showSetupCard is false, just initialize silently
  if (!showSetupCard) {
    return null;
  }

  return (
    <Card className="frosted-glass-card border border-[var(--glass-border)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Smartphone className="h-5 w-5 text-[var(--accent-primary)]" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {permission === 'granted' ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-[var(--text-primary)]">
                  {token ? 'Enabled' : 'Setting up...'}
                </span>
              </>
            ) : permission === 'denied' ? (
              <>
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm text-[var(--text-primary)]">Blocked</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-primary)]">Not enabled</span>
              </>
            )}
          </div>

          {permission === 'default' && (
            <Button
              onClick={requestNotificationPermission}
              disabled={isInitializing}
              size="sm"
              className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white"
            >
              {isInitializing ? 'Setting up...' : 'Enable'}
            </Button>
          )}

          {permission === 'granted' && token && (
            <Button
              onClick={disableNotifications}
              variant="outline"
              size="sm"
              className="border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-white/10"
            >
              <BellOff className="h-4 w-4 mr-1" />
              Disable
            </Button>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          {permission === 'granted' 
            ? 'Receive instant notifications for lead assignments and team updates.'
            : permission === 'denied'
            ? 'Notifications are blocked. Enable them in your browser settings to receive updates.'
            : 'Enable push notifications to stay updated on lead assignments and team changes.'
          }
        </p>

        {permission === 'denied' && (
          <div className="text-xs text-[var(--text-secondary)] bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="font-medium text-yellow-600 mb-1">Re-enable notifications:</p>
            <p>Click the 🔒 icon in your address bar → Notifications → Allow</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simple hook for basic PWA notification setup
export function usePWANotifications() {
  const { user } = useAuth();
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    if (!user || isSetup) return;

    // Auto-initialize PWA notifications silently
    const timer = setTimeout(() => {
      setIsSetup(true);
    }, 2000); // Wait 2 seconds after user loads to avoid overwhelming

    return () => clearTimeout(timer);
  }, [user, isSetup]);

  if (!isSetup || !user) return null;

  return <PushNotificationManager showSetupCard={false} autoRequestPermission={false} />;
}

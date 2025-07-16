"use client";

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// VAPID key (you'll need to get this from Firebase Console)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
  tag?: string;
}

class PushNotificationManager {
  private messaging: any = null;
  private currentToken: string | null = null;
  private isInitialized = false;

  async initialize(userId?: string) {
    if (this.isInitialized) return this.currentToken;
    
    try {
      // Check if running in browser and service workers are supported
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('🚫 Service workers not supported');
        return null;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('🚫 Notifications not supported');
        return null;
      }

      // Initialize Firebase Messaging
      this.messaging = getMessaging(app);
      
      // Request notification permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('🚫 Notification permission denied');
        return null;
      }

      // Get FCM token
      if (VAPID_KEY) {
        this.currentToken = await getToken(this.messaging, { 
          vapidKey: VAPID_KEY 
        });
      } else {
        console.warn('⚠️ VAPID key not configured');
        this.currentToken = await getToken(this.messaging);
      }

      if (this.currentToken) {
        console.log('✅ FCM Token obtained:', this.currentToken.substring(0, 20) + '...');
        
        // Store token in Firestore if user is logged in
        if (userId) {
          await this.storeTokenInFirestore(userId, this.currentToken);
        }
        
        // Set up foreground message handler
        this.setupForegroundMessageHandler();
        
        this.isInitialized = true;
        return this.currentToken;
      } else {
        console.log('❌ No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return null;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private async storeTokenInFirestore(userId: string, token: string) {
    try {
      const userTokensRef = doc(db, 'userTokens', userId);
      const existingDoc = await getDoc(userTokensRef);
      
      let tokens: string[] = [];
      if (existingDoc.exists()) {
        tokens = existingDoc.data().tokens || [];
      }
      
      // Add new token if it doesn't exist
      if (!tokens.includes(token)) {
        tokens.push(token);
        // Keep only the last 3 tokens (for multiple devices)
        if (tokens.length > 3) {
          tokens = tokens.slice(-3);
        }
      }
      
      await setDoc(userTokensRef, {
        tokens,
        lastUpdated: new Date(),
        userId
      }, { merge: true });
      
      console.log('✅ FCM token stored in Firestore');
    } catch (error) {
      console.error('❌ Error storing FCM token:', error);
    }
  }

  private setupForegroundMessageHandler() {
    if (!this.messaging) return;
    
    onMessage(this.messaging, (payload) => {
      console.log('📱 Foreground message received:', payload);
      
      // Only show lead assignment notifications in foreground
      if (payload.data?.type === 'lead_assigned') {
        this.showForegroundNotification({
          title: payload.notification?.title || 'New Lead Assigned',
          body: payload.notification?.body || 'You have a new lead',
          data: payload.data,
          tag: 'lead_assigned'
        });
      }
    });
  }

  private showForegroundNotification(notification: NotificationPayload) {
    // Create a visual notification for foreground
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        tag: notification.tag || 'leadflow',
        data: notification.data,
        requireInteraction: true
      });
      
      notif.onclick = () => {
        // Navigate to dashboard or specific lead
        const url = notification.data?.actionUrl || '/dashboard';
        window.focus();
        window.location.href = url;
        notif.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => notif.close(), 5000);
    }
  }

  async updateToken(userId: string) {
    if (!this.messaging) return null;
    
    try {
      const newToken = await getToken(this.messaging, { 
        vapidKey: VAPID_KEY 
      });
      
      if (newToken && newToken !== this.currentToken) {
        this.currentToken = newToken;
        await this.storeTokenInFirestore(userId, newToken);
        console.log('✅ FCM token updated');
      }
      
      return newToken;
    } catch (error) {
      console.error('❌ Error updating FCM token:', error);
      return null;
    }
  }

  getToken(): string | null {
    return this.currentToken;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'Notification' in window;
  }
}

// Create singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Convenience functions
export const initializePushNotifications = (userId?: string) => 
  pushNotificationManager.initialize(userId);

export const requestNotificationPermission = () => 
  pushNotificationManager.requestPermission();

export const getFCMToken = () => 
  pushNotificationManager.getToken();

export const updateFCMToken = (userId: string) => 
  pushNotificationManager.updateToken(userId);

export const isPushNotificationSupported = () => 
  pushNotificationManager.isSupported();

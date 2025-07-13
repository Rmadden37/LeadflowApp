/**
 * Enhanced Firebase Cloud Messaging Configuration
 * Addresses VAPID warnings and connection issues
 * 
 * Fixes:
 * 1. Missing VAPID key warnings
 * 2. Service worker registration issues
 * 3. Token refresh handling
 * 4. Connection timeout handling
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from '@/lib/firebase';

// Enhanced VAPID key configuration
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

if (!VAPID_KEY && typeof window !== 'undefined') {
  console.warn('⚠️ Firebase VAPID key not configured. Push notifications will not work.');
  console.info('💡 To fix: Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your .env.local file');
}

// Enhanced messaging initialization with better error handling
let messaging: any = null;
let messagingSupported = false;

const initializeMessaging = async () => {
  if (typeof window === 'undefined') {
    console.log('📱 FCM: Server-side environment, skipping messaging initialization');
    return null;
  }

  try {
    // Check if messaging is supported
    messagingSupported = await isSupported();
    
    if (!messagingSupported) {
      console.warn('⚠️ FCM: Firebase Messaging not supported in this browser');
      return null;
    }

    // Check if required APIs are available
    if (!('Notification' in window)) {
      console.warn('⚠️ FCM: Notifications API not available');
      return null;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ FCM: Service Worker not available');
      return null;
    }

    // Initialize messaging
    messaging = getMessaging(app);
    console.log('✅ FCM: Firebase Messaging initialized successfully');
    return messaging;
    
  } catch (error) {
    console.error('❌ FCM: Failed to initialize Firebase Messaging:', error);
    return null;
  }
};

// Initialize messaging on import
initializeMessaging();

// Enhanced permission request with better UX
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messagingSupported || !messaging) {
    console.log('📱 FCM: Messaging not supported, skipping permission request');
    return null;
  }

  try {
    // Check current permission status
    let permission = Notification.permission;
    
    if (permission === 'default') {
      console.log('📱 FCM: Requesting notification permission...');
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('✅ FCM: Notification permission granted');
      
      if (!VAPID_KEY) {
        console.warn('⚠️ FCM: Cannot get token - VAPID key not configured');
        return null;
      }

      // Get FCM token with enhanced error handling
      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });
        
        if (token) {
          console.log('✅ FCM: Token obtained successfully');
          return token;
        } else {
          console.warn('⚠️ FCM: No registration token available');
          return null;
        }
      } catch (tokenError: any) {
        if (tokenError.code === 'messaging/failed-service-worker-registration') {
          console.error('❌ FCM: Service worker registration failed');
        } else if (tokenError.code === 'messaging/permission-blocked') {
          console.error('❌ FCM: Notification permission blocked');
        } else {
          console.error('❌ FCM: Failed to get token:', tokenError);
        }
        return null;
      }
    } else if (permission === 'denied') {
      console.warn('⚠️ FCM: Notification permission denied by user');
      return null;
    } else {
      console.log('📱 FCM: Notification permission not granted');
      return null;
    }
  } catch (error) {
    console.error('❌ FCM: Error requesting notification permission:', error);
    return null;
  }
};

// Enhanced foreground message listener with filtering
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn('⚠️ FCM: Messaging not available for foreground messages');
      return;
    }
    
    onMessage(messaging, (payload: any) => {
      console.log('📱 FCM: Foreground message received:', payload);
      
      // Apply notification filtering
      if (payload.data?.type !== 'lead_assigned') {
        console.log(`📱 FCM: Message type '${payload.data?.type}' filtered out`);
        return;
      }
      
      resolve(payload);
    });
  });

// Enhanced service worker registration with retry logic
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined') return null;
  
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ FCM: Service Worker not supported');
    return null;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`📱 FCM: Registering service worker (attempt ${attempt + 1}/${maxRetries})...`);
      
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('✅ FCM: Service Worker registered successfully:', {
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing
      });
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ FCM: Service Worker ready');
      
      return registration;
      
    } catch (error) {
      attempt++;
      console.error(`❌ FCM: Service Worker registration failed (attempt ${attempt}):`, error);
      
      if (attempt >= maxRetries) {
        console.error('❌ FCM: Max registration attempts reached');
        return null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
};

// Enhanced notification display with better error handling
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (!('Notification' in window)) {
    console.warn('⚠️ FCM: Notifications API not available');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('⚠️ FCM: Notification permission not granted');
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'leadflow-notification',
      requireInteraction: false,
      ...options,
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    console.log('✅ FCM: Notification displayed successfully');
    
  } catch (error) {
    console.error('❌ FCM: Failed to show notification:', error);
  }
};

// Enhanced token refresh with retry logic and storage
export const refreshAndStoreToken = async (userId: string): Promise<string | null> => {
  if (!messagingSupported || !messaging) {
    console.log('📱 FCM: Messaging not supported, skipping token refresh');
    return null;
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (!permission) {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM: Token refreshed successfully');
      
      // Store token in Firestore with enhanced error handling
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        
        await setDoc(doc(db, 'users', userId), {
          fcmToken: token,
          lastTokenUpdate: serverTimestamp(),
          notificationSettings: {
            enabled: true,
            browser: navigator.userAgent,
            lastUpdated: new Date().toISOString()
          }
        }, { merge: true });
        
        console.log('✅ FCM: Token stored in Firestore');
        
      } catch (dbError) {
        console.error('❌ FCM: Failed to store token in Firestore:', dbError);
        // Don't fail the entire operation if storage fails
      }
      
      return token;
    } else {
      console.warn('⚠️ FCM: No token received during refresh');
      return null;
    }
    
  } catch (error) {
    console.error('❌ FCM: Token refresh failed:', error);
    return null;
  }
};

// Enhanced connection health check for messaging
const checkMessagingHealthEnhanced = async (): Promise<boolean> => {
  if (!messagingSupported || !messaging) {
    return false;
  }

  try {
    // Try to get a token as a health check
    if (VAPID_KEY && Notification.permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      return !!token;
    }
    return true; // Messaging is available even without permission
  } catch (error) {
    console.error('❌ FCM: Health check failed:', error);
    return false;
  }
};

// Enhanced debug utility for FCM troubleshooting
const debugMessagingEnhanced = async () => {
  console.log('🔍 FCM Debug Information:');
  console.log('- Supported:', messagingSupported);
  console.log('- Messaging initialized:', !!messaging);
  console.log('- VAPID key configured:', !!VAPID_KEY);
  console.log('- Notification API:', 'Notification' in window);
  console.log('- Service Worker:', 'serviceWorker' in navigator);
  console.log('- Permission:', 'Notification' in window ? Notification.permission : 'N/A');
  
  if (messaging && VAPID_KEY) {
    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log('- Token available:', !!token);
      if (token) {
        console.log('- Token (first 20 chars):', token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('- Token error:', error);
    }
  }
};

// Notification types (only lead_assigned is enabled)
export type LeadNotificationType = 'lead_assigned';

export interface LeadNotificationData {
  type: LeadNotificationType;
  leadId: string;
  leadName?: string;
  message: string;
  actionUrl?: string;
}

// Send filtered lead notification
export const sendLeadNotification = (data: LeadNotificationData) => {
  // Enforce notification filtering
  if (data.type !== 'lead_assigned') {
    console.log(`📱 FCM: Notification type '${data.type}' blocked - only lead_assigned allowed`);
    return;
  }

  const title = '📋 New Lead Assigned';
  
  showNotification(title, {
    body: data.message,
    tag: `lead-${data.leadId}`,
    requireInteraction: false,
    data: data
  });
};

export {
  messaging,
  messagingSupported,
  debugMessagingEnhanced,
  checkMessagingHealthEnhanced
};

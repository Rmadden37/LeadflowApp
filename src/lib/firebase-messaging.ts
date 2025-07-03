// Firebase Cloud Messaging setup for push notifications
/* eslint-disable no-undef */
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';

// Your Firebase Web Push Certificate (VAPID key) - you'll need to get this from Firebase Console
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'your-vapid-key-here';

// Patch messaging initialization to check for support
let messaging: any = null;
if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn('Firebase messaging not supported in this environment:', e);
    messaging = null;
  }
} else {
  messaging = null;
}

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        console.log('FCM token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    
    onMessage(messaging, (payload: any) => {
      console.log('Message received. ', payload);
      
      // NOTIFICATION FILTERING: Only allow 'lead_assigned' notifications
      if (payload.data?.type !== 'lead_assigned') {
        console.log(`Notification type '${payload.data?.type}' blocked - only lead_assigned notifications allowed`);
        return; // Don't process the notification
      }
      
      resolve(payload);
    });
  });

// Register service worker for background notifications
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined') return null;
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Show browser notification
export const showNotification = (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      ...options,
    });
  }
};

// Debug token utility
export const debugToken = (token: string): void => {
  console.log('Debug FCM token:', token);
  
  // Check current permissions
  if ('Notification' in window) {
    console.log('Notification permission:', Notification.permission);
  }
  
  // Test if token is valid by sending a test message from Firebase console
  // targeting this specific token
  const encodedToken = encodeURIComponent(token);
  console.log(`Use this URL to test the token: https://console.firebase.google.com/project/leadflow-4lvrr/notification/compose?tokens=${encodedToken}`);
};

// Enhanced token refresh and storage function for production
export const refreshAndStoreToken = async (userId: string): Promise<string | null> => {
  try {
    if (!messaging) {
      console.log('Messaging not supported');
      return null;
    }

    // Request permission
    let permission = Notification.permission;
    
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        console.log('FCM token obtained:', token);
        
        // Save token to Firestore if we have Firebase initialized
        if (typeof window !== 'undefined') {
          try {
            const { db } = await import('@/lib/firebase');
            const { doc, getDoc, setDoc, arrayUnion } = await import('firebase/firestore');
            
            const userTokensRef = doc(db, "userTokens", userId);
            const tokenDoc = await getDoc(userTokensRef);
            
            if (tokenDoc.exists()) {
              // Check if token already exists
              const tokens = tokenDoc.data()?.tokens || [];
              if (!tokens.includes(token)) {
                await setDoc(userTokensRef, { 
                  tokens: arrayUnion(token) 
                }, { merge: true });
                console.log('New FCM token added to Firestore');
              } else {
                console.log('FCM token already exists in Firestore');
              }
            } else {
              // Create new document
              await setDoc(userTokensRef, { 
                tokens: [token],
                userId: userId
              });
              console.log('Initial FCM token added to Firestore');
            }
          } catch (dbError) {
            console.error('Error saving token to Firestore:', dbError);
          }
        }
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Notification types for LeadFlow - ONLY lead_assigned is enabled
export type LeadNotificationType = 'lead_assigned'; // All other types disabled

export interface LeadNotificationData {
  type: LeadNotificationType;
  leadId: string;
  leadName?: string;
  message: string;
  actionUrl?: string;
}

export const sendLeadNotification = (data: LeadNotificationData) => {
  // Only allow lead_assigned notifications
  if (data.type !== 'lead_assigned') {
    console.log(`Notification type '${data.type}' blocked - only lead_assigned notifications allowed`);
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

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Comprehensive browser support detection
const getBrowserSupport = () => {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      reason: 'Server-side rendering'
    };
  }

  // Check for HTTPS (required for service workers)
  if (!window.isSecureContext) {
    return {
      isSupported: false,
      reason: 'Requires HTTPS'
    };
  }

  // Check for service worker support
  if (!('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      reason: 'Service workers not supported'
    };
  }

  // Check for notification support
  if (!('Notification' in window)) {
    return {
      isSupported: false,
      reason: 'Notifications not supported'
    };
  }

  // Check for Push API support
  if (!('PushManager' in window)) {
    return {
      isSupported: false,
      reason: 'Push API not supported'
    };
  }

  // Check for fetch API support
  if (!('fetch' in window)) {
    return {
      isSupported: false,
      reason: 'Fetch API not supported'
    };
  }

  // Check for IndexedDB support (required by Firebase)
  if (!('indexedDB' in window)) {
    return {
      isSupported: false,
      reason: 'IndexedDB not supported'
    };
  }

  // Browser-specific checks
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Chrome iOS doesn't support service workers properly
  if (userAgent.includes('crios')) {
    return {
      isSupported: false,
      reason: 'Chrome iOS not supported'
    };
  }

  // Firefox iOS doesn't support service workers
  if (userAgent.includes('fxios')) {
    return {
      isSupported: false,
      reason: 'Firefox iOS not supported'
    };
  }

  // Very old browsers
  if (userAgent.includes('msie') || userAgent.includes('trident')) {
    return {
      isSupported: false,
      reason: 'Internet Explorer not supported'
    };
  }

  return {
    isSupported: true,
    reason: 'All requirements met'
  };
};

const BadgeService = {
  isInitialized: false,
  
  async initialize(userId?: string) {
    // Prevent multiple initializations
    if (this.isInitialized) {
      console.log('BadgeService: Already initialized');
      return;
    }

    const support = getBrowserSupport();
    if (!support.isSupported) {
      console.log(`BadgeService: Not supported - ${support.reason}`);
      return;
    }

    try {
      console.log('BadgeService: Starting initialization...');
      
      // Register service worker with error handling
      const registration = await this.registerServiceWorker();
      if (!registration) {
        console.warn('BadgeService: Service worker registration failed');
        return;
      }

      // Initialize Firebase messaging only if we have a user
      if (userId) {
        await this.initializeFirebaseMessaging(userId, registration);
      }

      this.isInitialized = true;
      console.log('BadgeService: Initialization complete');

    } catch (error) {
      console.warn('BadgeService: Initialization failed', error);
      // Don't throw - allow app to continue without notifications
    }
  },

  async registerServiceWorker() {
    try {
      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/');
      if (existingRegistration) {
        console.log('BadgeService: Using existing service worker registration');
        return existingRegistration;
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('BadgeService: Service worker registered successfully');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;

    } catch (error) {
      console.error('BadgeService: Service worker registration failed', error);
      return null;
    }
  },

  async initializeFirebaseMessaging(userId: string, registration: ServiceWorkerRegistration) {
    try {
      // Dynamic import Firebase modules to avoid SSR issues
      const [
        { getMessaging, isSupported },
        { getToken, onMessage }
      ] = await Promise.all([
        import('firebase/messaging'),
        import('firebase/messaging')
      ]);

      // Check if Firebase Messaging is supported
      const messagingSupported = await isSupported();
      if (!messagingSupported) {
        console.log('BadgeService: Firebase Messaging not supported in this browser');
        return;
      }

      const { app } = await import('@/lib/firebase');
      const messaging = getMessaging(app);

      // Request notification permission
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        console.log('BadgeService: Notification permission not granted');
        return;
      }

      // Get FCM token
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidKey) {
        console.warn('BadgeService: VAPID key not configured');
        return;
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('BadgeService: FCM token received');
        await this.storeUserToken(userId, token);
      } else {
        console.log('BadgeService: No FCM token received');
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('BadgeService: Foreground message received', payload);
        this.handleForegroundMessage(payload);
      });

    } catch (error) {
      console.warn('BadgeService: Firebase Messaging initialization failed', error);
      // Don't throw - app should continue without push notifications
    }
  },

  async requestNotificationPermission() {
    try {
      if (!('Notification' in window)) {
        return 'denied';
      }

      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      return permission;
    } catch (error) {
      console.warn('BadgeService: Failed to request notification permission', error);
      return 'denied';
    }
  },

  async storeUserToken(userId: string, token: string) {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        lastTokenUpdate: serverTimestamp(),
        notificationSettings: {
          enabled: true,
          browser: navigator.userAgent
        }
      });

      console.log('BadgeService: FCM token stored successfully');
    } catch (error) {
      console.warn('BadgeService: Failed to store FCM token', error);
    }
  },

  handleForegroundMessage(payload: any) {
    try {
      const { notification, data } = payload;
      
      if (!notification) {
        console.log('BadgeService: No notification data in payload');
        return;
      }

      // Show browser notification if permission is granted
      if (Notification.permission === 'granted') {
        const notificationOptions = {
          body: notification.body || '',
          icon: notification.icon || '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'leadflow-notification',
          data: data || {},
          requireInteraction: false,
          silent: false
        };

        new Notification(notification.title || 'LeadFlow', notificationOptions);
      }

    } catch (error) {
      console.warn('BadgeService: Failed to handle foreground message', error);
    }
  },

  // Public method to check if the service is available
  isAvailable() {
    return getBrowserSupport().isSupported;
  },

  // Public method to get support details
  getSupportInfo() {
    return getBrowserSupport();
  }
};

export function BadgeServiceInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Check support before attempting initialization
    const support = getBrowserSupport();
    if (!support.isSupported) {
      console.log(`BadgeService: Skipping initialization - ${support.reason}`);
      return;
    }

    // Initialize with user if available
    if (user?.uid) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        BadgeService.initialize(user.uid);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      // Initialize without user (just service worker)
      const timer = setTimeout(() => {
        BadgeService.initialize();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user?.uid]);

  return null;
}

export default BadgeService;
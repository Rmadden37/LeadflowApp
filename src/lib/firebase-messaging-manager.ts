/**
 * Enhanced Firebase Messaging System
 * 
 * Resolves VAPID warnings and improves push notification reliability:
 * - Proper VAPID key configuration
 * - Service worker error handling
 * - Token refresh strategies
 * - Message filtering and processing
 * - iOS-optimized notifications
 * 
 * @author Aurelian Salomon
 */

import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported,
  type Messaging 
} from 'firebase/messaging';
import { app } from '@/lib/firebase';

interface MessagingConfig {
  vapidKey: string;
  serviceWorkerPath: string;
  retryAttempts: number;
  tokenRefreshInterval: number;
}

interface MessagingState {
  isSupported: boolean;
  isInitialized: boolean;
  hasPermission: boolean;
  currentToken: string | null;
  lastTokenRefresh: Date | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
}

export class FirebaseMessagingManager {
  private static instance: FirebaseMessagingManager;
  private messaging: Messaging | null = null;
  private config: MessagingConfig;
  private state: MessagingState = {
    isSupported: false,
    isInitialized: false,
    hasPermission: false,
    currentToken: null,
    lastTokenRefresh: null,
    serviceWorkerRegistration: null
  };

  private tokenRefreshInterval: NodeJS.Timeout | null = null;
  private messageListeners: Array<(payload: any) => void> = [];

  private constructor(config: MessagingConfig) {
    this.config = config;
    this.initialize();
  }

  public static getInstance(config?: Partial<MessagingConfig>): FirebaseMessagingManager {
    if (!FirebaseMessagingManager.instance) {
      const defaultConfig: MessagingConfig = {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
        serviceWorkerPath: '/firebase-messaging-sw.js',
        retryAttempts: 3,
        tokenRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
      };

      FirebaseMessagingManager.instance = new FirebaseMessagingManager({
        ...defaultConfig,
        ...config
      });
    }
    return FirebaseMessagingManager.instance;
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      console.log('📱 FCM: Server-side environment, skipping initialization');
      return;
    }

    console.log('🔄 Initializing Firebase Messaging Manager...');

    try {
      // Validate configuration
      this.validateConfig();

      // Check browser support
      this.state.isSupported = await isSupported();
      if (!this.state.isSupported) {
        console.warn('⚠️ FCM: Not supported in this browser');
        return;
      }

      // Check required APIs
      if (!this.checkRequiredAPIs()) {
        return;
      }

      // Register service worker first
      await this.registerServiceWorker();

      // Initialize messaging
      this.messaging = getMessaging(app);
      this.state.isInitialized = true;

      // Setup message listener
      this.setupForegroundMessageListener();

      // Start automatic token refresh
      this.startTokenRefresh();

      console.log('✅ Firebase Messaging Manager initialized successfully');

    } catch (error) {
      console.error('❌ FCM: Initialization failed:', error);
      this.handleInitializationError(error);
    }
  }

  private validateConfig(): void {
    if (!this.config.vapidKey) {
      throw new Error('VAPID key is required for Firebase Messaging');
    }

    if (this.config.vapidKey.length < 80) {
      throw new Error('Invalid VAPID key format');
    }

    console.log('✅ FCM: Configuration validated');
  }

  private checkRequiredAPIs(): boolean {
    const required = [
      { name: 'Notifications', available: 'Notification' in window },
      { name: 'Service Worker', available: 'serviceWorker' in navigator },
      { name: 'Push Manager', available: 'PushManager' in window }
    ];

    const missing = required.filter(api => !api.available);
    
    if (missing.length > 0) {
      console.warn('⚠️ FCM: Missing required APIs:', missing.map(api => api.name));
      return false;
    }

    console.log('✅ FCM: All required APIs available');
    return true;
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        console.log(`📱 FCM: Registering service worker (attempt ${attempt + 1}/${maxAttempts})...`);

        const registration = await navigator.serviceWorker.register(
          this.config.serviceWorkerPath,
          {
            scope: '/',
            updateViaCache: 'none'
          }
        );

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        this.state.serviceWorkerRegistration = registration;
        
        console.log('✅ FCM: Service worker registered successfully', {
          scope: registration.scope,
          active: !!registration.active
        });

        // Setup update listener
        this.setupServiceWorkerUpdateListener(registration);
        
        return;

      } catch (error) {
        attempt++;
        console.error(`❌ FCM: Service worker registration failed (attempt ${attempt}):`, error);

        if (attempt >= maxAttempts) {
          throw new Error(`Service worker registration failed after ${maxAttempts} attempts`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private setupServiceWorkerUpdateListener(registration: ServiceWorkerRegistration): void {
    registration.addEventListener('updatefound', () => {
      console.log('🔄 FCM: Service worker update found');
      
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✅ FCM: New service worker ready');
            // Optionally prompt user to reload
            this.notifyServiceWorkerUpdate();
          }
        });
      }
    });
  }

  private notifyServiceWorkerUpdate(): void {
    // This could trigger a user notification about app updates
    console.log('💡 FCM: App update available');
  }

  private setupForegroundMessageListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('📱 FCM: Foreground message received:', payload);

      // Apply message filtering
      if (!this.shouldProcessMessage(payload)) {
        return;
      }

      // Process the message
      this.processForegroundMessage(payload);

      // Notify all registered listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error('❌ FCM: Message listener error:', error);
        }
      });
    });

    console.log('✅ FCM: Foreground message listener setup');
  }

  private shouldProcessMessage(payload: any): boolean {
    // Only allow 'lead_assigned' notifications
    const messageType = payload.data?.type;
    
    if (messageType !== 'lead_assigned') {
      console.log(`📱 FCM: Message type '${messageType}' filtered out`);
      return false;
    }

    return true;
  }

  private processForegroundMessage(payload: any): void {
    // Show in-app notification for foreground messages
    if (payload.notification) {
      this.showInAppNotification(payload.notification.title, payload.notification.body);
    }
  }

  private showInAppNotification(title: string, body: string): void {
    // Create and show browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'leadflow-foreground',
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('✅ FCM: In-app notification displayed');
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('⚠️ FCM: Notifications API not available');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.state.hasPermission = true;
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.state.hasPermission = permission === 'granted';
      
      console.log(`📱 FCM: Permission ${permission}`);
      return permission;

    } catch (error) {
      console.error('❌ FCM: Permission request failed:', error);
      return 'denied';
    }
  }

  public async getToken(): Promise<string | null> {
    if (!this.messaging || !this.state.serviceWorkerRegistration) {
      console.warn('⚠️ FCM: Messaging not properly initialized');
      return null;
    }

    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('⚠️ FCM: Permission not granted');
        return null;
      }

      const token = await getToken(this.messaging, {
        vapidKey: this.config.vapidKey,
        serviceWorkerRegistration: this.state.serviceWorkerRegistration
      });

      if (token) {
        this.state.currentToken = token;
        this.state.lastTokenRefresh = new Date();
        console.log('✅ FCM: Token obtained successfully');
      } else {
        console.warn('⚠️ FCM: No token received');
      }

      return token;

    } catch (error: any) {
      console.error('❌ FCM: Token retrieval failed:', error);
      
      // Handle specific error types
      if (error.code === 'messaging/failed-service-worker-registration') {
        console.error('❌ FCM: Service worker registration issue');
        await this.registerServiceWorker();
      } else if (error.code === 'messaging/permission-blocked') {
        console.error('❌ FCM: Permission blocked by user');
      }

      return null;
    }
  }

  public async refreshToken(): Promise<string | null> {
    console.log('🔄 FCM: Refreshing token...');
    this.state.currentToken = null;
    return await this.getToken();
  }

  private startTokenRefresh(): void {
    // Clear existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Set up periodic token refresh
    this.tokenRefreshInterval = setInterval(async () => {
      console.log('⏰ FCM: Automatic token refresh');
      await this.refreshToken();
    }, this.config.tokenRefreshInterval);

    console.log('✅ FCM: Token refresh scheduler started');
  }

  public addMessageListener(listener: (payload: any) => void): () => void {
    this.messageListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  public getState(): Readonly<MessagingState> {
    return { ...this.state };
  }

  private handleInitializationError(error: any): void {
    console.error('❌ FCM: Critical initialization error:', error);
    
    // Reset state
    this.state = {
      isSupported: false,
      isInitialized: false,
      hasPermission: false,
      currentToken: null,
      lastTokenRefresh: null,
      serviceWorkerRegistration: null
    };
  }

  public async debugMessaging(): Promise<void> {
    console.log('🔍 FCM Debug Information:');
    console.log('- State:', this.state);
    console.log('- Config:', this.config);
    console.log('- VAPID key configured:', !!this.config.vapidKey);
    console.log('- Messaging initialized:', !!this.messaging);
    console.log('- Permission:', Notification.permission);
    
    if (this.state.currentToken) {
      console.log('- Current token (first 20 chars):', this.state.currentToken.substring(0, 20) + '...');
    }
  }

  public destroy(): void {
    console.log('🧹 Cleaning up Firebase Messaging Manager...');
    
    // Clear token refresh interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    // Clear message listeners
    this.messageListeners = [];

    // Reset state
    this.state = {
      isSupported: false,
      isInitialized: false,
      hasPermission: false,
      currentToken: null,
      lastTokenRefresh: null,
      serviceWorkerRegistration: null
    };

    console.log('✅ Firebase Messaging Manager cleanup complete');
  }
}

// Convenience functions for easy usage
export const initializeMessaging = (config?: Partial<MessagingConfig>) => {
  return FirebaseMessagingManager.getInstance(config);
};

export const getMessagingToken = async (): Promise<string | null> => {
  const manager = FirebaseMessagingManager.getInstance();
  return await manager.getToken();
};

export const addForegroundMessageListener = (listener: (payload: any) => void) => {
  const manager = FirebaseMessagingManager.getInstance();
  return manager.addMessageListener(listener);
};

export const debugFCM = async (): Promise<void> => {
  const manager = FirebaseMessagingManager.getInstance();
  await manager.debugMessaging();
};

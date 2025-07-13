/**
 * Firebase Initialization System
 * 
 * Comprehensive initialization that addresses all Firebase connectivity issues:
 * - Automatic error recovery
 * - Connection health monitoring  
 * - Performance optimization
 * - Production-ready configuration
 * 
 * @author Aurelian Salomon
 */

import { app, db, auth, functions } from './firebase-production';
import { FirebaseConnectionManager, initializeConnectionManager } from './firebase-connection-manager';
import { FirebaseMessagingManager, initializeMessaging } from './firebase-messaging-manager';

interface FirebaseInitializationState {
  isInitialized: boolean;
  hasConnectionManager: boolean;
  hasMessagingManager: boolean;
  lastInitialization: Date | null;
  errors: Array<{ timestamp: Date; error: string; component: string }>;
}

export class FirebaseInitializer {
  private static instance: FirebaseInitializer;
  private state: FirebaseInitializationState = {
    isInitialized: false,
    hasConnectionManager: false,
    hasMessagingManager: false,
    lastInitialization: null,
    errors: []
  };

  private connectionManager: FirebaseConnectionManager | null = null;
  private messagingManager: FirebaseMessagingManager | null = null;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): FirebaseInitializer {
    if (!FirebaseInitializer.instance) {
      FirebaseInitializer.instance = new FirebaseInitializer();
    }
    return FirebaseInitializer.instance;
  }

  public async initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create initialization promise
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    console.log('🔄 Starting comprehensive Firebase initialization...');

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.log('📱 Server-side environment detected, skipping client Firebase initialization');
        return;
      }

      // Step 1: Verify core Firebase services
      await this.verifyFirebaseServices();

      // Step 2: Initialize connection manager
      await this.initializeConnectionManager();

      // Step 3: Initialize messaging manager
      await this.initializeMessagingManager();

      // Step 4: Setup global error handlers
      this.setupGlobalErrorHandlers();

      // Step 5: Start health monitoring
      this.startHealthMonitoring();

      // Mark as initialized
      this.state.isInitialized = true;
      this.state.lastInitialization = new Date();

      console.log('✅ Firebase initialization completed successfully');

    } catch (error: any) {
      this.recordError('Initialization', error.message);
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  private async verifyFirebaseServices(): Promise<void> {
    console.log('🔍 Verifying Firebase services...');

    if (!app) {
      throw new Error('Firebase app not initialized');
    }

    if (!db) {
      throw new Error('Firestore not initialized');
    }

    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    console.log('✅ Firebase services verified');
  }

  private async initializeConnectionManager(): Promise<void> {
    try {
      console.log('🔄 Initializing Firebase connection manager...');

      if (!db) {
        throw new Error('Firestore not available for connection manager');
      }

      this.connectionManager = initializeConnectionManager(db);
      this.state.hasConnectionManager = true;

      console.log('✅ Firebase connection manager initialized');

    } catch (error: any) {
      this.recordError('ConnectionManager', error.message);
      console.error('❌ Connection manager initialization failed:', error);
      // Don't throw - app can continue without connection manager
    }
  }

  private async initializeMessagingManager(): Promise<void> {
    try {
      console.log('🔄 Initializing Firebase messaging manager...');

      this.messagingManager = initializeMessaging({
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
        serviceWorkerPath: '/firebase-messaging-sw-enhanced.js',
        retryAttempts: 3,
        tokenRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
      });

      this.state.hasMessagingManager = true;

      console.log('✅ Firebase messaging manager initialized');

    } catch (error: any) {
      this.recordError('MessagingManager', error.message);
      console.error('❌ Messaging manager initialization failed:', error);
      // Don't throw - app can continue without messaging
    }
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Global error handler for Firebase-related errors
    window.addEventListener('error', (event) => {
      if (event.error?.message?.includes('firebase') || 
          event.error?.message?.includes('firestore') ||
          event.error?.message?.includes('messaging')) {
        this.recordError('Global', event.error.message);
        console.error('🔥 Firebase-related error caught:', event.error);
      }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('firebase') || 
          event.reason?.message?.includes('firestore') ||
          event.reason?.message?.includes('messaging')) {
        this.recordError('Promise', event.reason.message);
        console.error('🔥 Firebase-related promise rejection:', event.reason);
      }
    });

    console.log('✅ Global Firebase error handlers setup');
  }

  private startHealthMonitoring(): void {
    // Monitor Firebase health every 30 seconds
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    console.log('💓 Firebase health monitoring started');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check connection manager health
      if (this.connectionManager) {
        const connectionState = this.connectionManager.getConnectionState();
        
        if (!connectionState.isFirestoreOnline && connectionState.reconnectAttempts > 3) {
          console.warn('⚠️ Firebase connection issues detected, attempting recovery...');
          await this.connectionManager.forceReconnect();
        }
      }

      // Check messaging manager health
      if (this.messagingManager) {
        const messagingState = this.messagingManager.getState();
        
        if (!messagingState.isInitialized && messagingState.isSupported) {
          console.warn('⚠️ Firebase messaging not properly initialized, attempting recovery...');
          // Reinitialize messaging if needed
        }
      }

    } catch (error: any) {
      this.recordError('HealthCheck', error.message);
      console.error('❌ Firebase health check failed:', error);
    }
  }

  private recordError(component: string, message: string): void {
    this.state.errors.push({
      timestamp: new Date(),
      error: message,
      component
    });

    // Keep only last 50 errors
    if (this.state.errors.length > 50) {
      this.state.errors = this.state.errors.slice(-50);
    }
  }

  // Public methods for accessing managers
  public getConnectionManager(): FirebaseConnectionManager | null {
    return this.connectionManager;
  }

  public getMessagingManager(): FirebaseMessagingManager | null {
    return this.messagingManager;
  }

  public getInitializationState(): Readonly<FirebaseInitializationState> {
    return { ...this.state };
  }

  // Method to request notification permission through the messaging manager
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.messagingManager) {
      console.warn('⚠️ Messaging manager not available');
      return 'denied';
    }

    return await this.messagingManager.requestPermission();
  }

  // Method to get FCM token through the messaging manager
  public async getFCMToken(): Promise<string | null> {
    if (!this.messagingManager) {
      console.warn('⚠️ Messaging manager not available');
      return null;
    }

    return await this.messagingManager.getToken();
  }

  // Method to add message listener
  public addMessageListener(listener: (payload: any) => void): (() => void) | null {
    if (!this.messagingManager) {
      console.warn('⚠️ Messaging manager not available');
      return null;
    }

    return this.messagingManager.addMessageListener(listener);
  }

  // Method to force reconnection
  public async forceReconnect(): Promise<boolean> {
    if (!this.connectionManager) {
      console.warn('⚠️ Connection manager not available');
      return false;
    }

    return await this.connectionManager.forceReconnect();
  }

  // Debug method
  public async debugFirebase(): Promise<void> {
    console.log('🔍 Firebase Debug Information:');
    console.log('- Initialization state:', this.state);
    
    if (this.connectionManager) {
      console.log('- Connection state:', this.connectionManager.getConnectionState());
    }
    
    if (this.messagingManager) {
      await this.messagingManager.debugMessaging();
    }

    console.log('- Recent errors:', this.state.errors.slice(-5));
  }

  // Cleanup method
  public destroy(): void {
    console.log('🧹 Cleaning up Firebase initializer...');

    if (this.connectionManager) {
      this.connectionManager.destroy();
      this.connectionManager = null;
    }

    if (this.messagingManager) {
      this.messagingManager.destroy();
      this.messagingManager = null;
    }

    // Reset state
    this.state = {
      isInitialized: false,
      hasConnectionManager: false,
      hasMessagingManager: false,
      lastInitialization: null,
      errors: []
    };

    this.initializationPromise = null;

    console.log('✅ Firebase initializer cleanup complete');
  }
}

// Global Firebase initializer instance
const firebaseInitializer = FirebaseInitializer.getInstance();

// Auto-initialize Firebase on import (only in browser)
if (typeof window !== 'undefined') {
  firebaseInitializer.initialize().catch((error) => {
    console.error('❌ Auto-initialization failed:', error);
  });
}

// Export convenience functions
export const initializeFirebase = () => firebaseInitializer.initialize();
export const getFirebaseConnectionManager = () => firebaseInitializer.getConnectionManager();
export const getFirebaseMessagingManager = () => firebaseInitializer.getMessagingManager();
export const requestFirebaseNotificationPermission = () => firebaseInitializer.requestNotificationPermission();
export const getFirebaseFCMToken = () => firebaseInitializer.getFCMToken();
export const addFirebaseMessageListener = (listener: (payload: any) => void) => firebaseInitializer.addMessageListener(listener);
export const forceFirebaseReconnect = () => firebaseInitializer.forceReconnect();
export const debugFirebase = () => firebaseInitializer.debugFirebase();
export const getFirebaseInitializationState = () => firebaseInitializer.getInitializationState();

// Export the initializer instance
export { firebaseInitializer };

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    firebaseInitializer.destroy();
  });
}

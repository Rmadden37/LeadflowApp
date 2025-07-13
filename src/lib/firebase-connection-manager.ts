/**
 * Firebase Connection Manager
 * 
 * Resolves common Firebase connectivity issues:
 * - WebChannelConnection timeouts
 * - Intermittent connection drops
 * - Retry logic with exponential backoff
 * - Connection health monitoring
 * - Error recovery strategies
 * 
 * @author Aurelian Salomon
 */

import { 
  enableNetwork, 
  disableNetwork, 
  clearIndexedDbPersistence,
  enableIndexedDbPersistence,
  Firestore,
  connectFirestoreEmulator
} from 'firebase/firestore';

interface ConnectionState {
  isOnline: boolean;
  isFirestoreOnline: boolean;
  reconnectAttempts: number;
  lastDisconnect: Date | null;
  healthCheckInterval: NodeJS.Timeout | null;
}

export class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private db: Firestore;
  private state: ConnectionState = {
    isOnline: navigator?.onLine ?? true,
    isFirestoreOnline: true,
    reconnectAttempts: 0,
    lastDisconnect: null,
    healthCheckInterval: null
  };

  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_BASE = 1000; // 1 second
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds

  private constructor(db: Firestore) {
    this.db = db;
    this.initialize();
  }

  public static getInstance(db: Firestore): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager(db);
    }
    return FirebaseConnectionManager.instance;
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    console.log('🔄 Initializing Firebase Connection Manager...');

    // Setup connection event listeners
    this.setupConnectionListeners();
    
    // Enable offline persistence with error handling
    this.enablePersistence();
    
    // Start health monitoring
    this.startHealthMonitoring();

    console.log('✅ Firebase Connection Manager initialized');
  }

  private setupConnectionListeners(): void {
    if (typeof window === 'undefined') return;

    // Browser connection state listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Firestore connection state listeners
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Visibility change for connection optimization
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private async enablePersistence(): Promise<void> {
    try {
      await enableIndexedDbPersistence(this.db);
      console.log('✅ Firestore offline persistence enabled');
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Firestore persistence failed: Multiple tabs open');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Firestore persistence not available in this browser');
      } else {
        console.error('❌ Failed to enable Firestore persistence:', error);
      }
    }
  }

  private async handleOnline(): Promise<void> {
    console.log('🌐 Network connection restored');
    this.state.isOnline = true;
    
    if (!this.state.isFirestoreOnline) {
      await this.reconnectFirestore();
    }
  }

  private async handleOffline(): Promise<void> {
    console.log('📴 Network connection lost');
    this.state.isOnline = false;
    this.state.lastDisconnect = new Date();
    
    // Gracefully disable Firestore network
    await this.disconnectFirestore();
  }

  private async handleVisibilityChange(): Promise<void> {
    if (document.hidden) {
      // Page is hidden, reduce resource usage
      console.log('👁️ Page hidden, optimizing Firebase connections');
      this.stopHealthMonitoring();
    } else {
      // Page is visible, restore full functionality
      console.log('👁️ Page visible, restoring Firebase connections');
      this.startHealthMonitoring();
      
      if (this.state.isOnline && !this.state.isFirestoreOnline) {
        await this.reconnectFirestore();
      }
    }
  }

  private async handleBeforeUnload(): Promise<void> {
    console.log('🚪 Page unloading, cleaning up Firebase connections');
    this.stopHealthMonitoring();
    await this.disconnectFirestore();
  }

  private async reconnectFirestore(): Promise<boolean> {
    if (this.state.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Max reconnection attempts reached');
      return false;
    }

    this.state.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY_BASE * Math.pow(2, this.state.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting Firestore (attempt ${this.state.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    
    try {
      // Wait before attempting reconnection
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Enable Firestore network with timeout
      await Promise.race([
        enableNetwork(this.db),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.CONNECTION_TIMEOUT)
        )
      ]);
      
      this.state.isFirestoreOnline = true;
      this.state.reconnectAttempts = 0;
      console.log('✅ Firestore reconnected successfully');
      return true;
      
    } catch (error) {
      console.error(`❌ Firestore reconnection failed (attempt ${this.state.reconnectAttempts}):`, error);
      
      if (this.state.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        // Schedule another attempt
        setTimeout(() => this.reconnectFirestore(), delay);
      }
      
      return false;
    }
  }

  private async disconnectFirestore(): Promise<void> {
    if (!this.state.isFirestoreOnline) return;
    
    try {
      await disableNetwork(this.db);
      this.state.isFirestoreOnline = false;
      console.log('✅ Firestore network disabled gracefully');
    } catch (error) {
      console.error('❌ Failed to disable Firestore network:', error);
    }
  }

  private startHealthMonitoring(): void {
    if (this.state.healthCheckInterval) return;
    
    this.state.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
    
    console.log('💓 Firebase health monitoring started');
  }

  private stopHealthMonitoring(): void {
    if (this.state.healthCheckInterval) {
      clearInterval(this.state.healthCheckInterval);
      this.state.healthCheckInterval = null;
      console.log('💤 Firebase health monitoring stopped');
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.state.isOnline || !this.state.isFirestoreOnline) return;
    
    try {
      // Simple health check query with timeout
      const { collection, limit, getDocs, query } = await import('firebase/firestore');
      const testQuery = query(collection(this.db, 'users'), limit(1));
      
      await Promise.race([
        getDocs(testQuery),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      // Reset reconnect attempts on successful health check
      this.state.reconnectAttempts = 0;
      
    } catch (error) {
      console.warn('⚠️ Firebase health check failed:', error);
      
      // Mark as offline and attempt reconnection
      this.state.isFirestoreOnline = false;
      if (this.state.isOnline) {
        await this.reconnectFirestore();
      }
    }
  }

  // Public methods for manual connection control
  public async forceReconnect(): Promise<boolean> {
    console.log('🔄 Force reconnecting Firebase...');
    this.state.reconnectAttempts = 0;
    return await this.reconnectFirestore();
  }

  public getConnectionState(): Readonly<ConnectionState> {
    return { ...this.state };
  }

  public async clearPersistence(): Promise<void> {
    try {
      await this.disconnectFirestore();
      await clearIndexedDbPersistence(this.db);
      console.log('✅ Firebase persistence cleared');
      
      if (this.state.isOnline) {
        await this.reconnectFirestore();
      }
    } catch (error) {
      console.error('❌ Failed to clear Firebase persistence:', error);
    }
  }

  // Cleanup method for proper resource disposal
  public destroy(): void {
    if (typeof window === 'undefined') return;
    
    console.log('🧹 Cleaning up Firebase Connection Manager...');
    
    this.stopHealthMonitoring();
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    console.log('✅ Firebase Connection Manager cleanup complete');
  }
}

// Utility function to initialize connection manager
export const initializeConnectionManager = (db: Firestore): FirebaseConnectionManager => {
  return FirebaseConnectionManager.getInstance(db);
};

// Export connection state monitoring hook for React components
export const useFirebaseConnectionState = (connectionManager: FirebaseConnectionManager) => {
  const [state, setState] = React.useState(connectionManager.getConnectionState());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setState(connectionManager.getConnectionState());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [connectionManager]);
  
  return state;
};

// Re-export React for the hook
import React from 'react';

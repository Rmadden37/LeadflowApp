/**
 * Production-Ready Firebase Configuration
 * 
 * Comprehensive solution for Firebase connectivity issues:
 * - Connection timeout handling
 * - Error recovery strategies  
 * - Performance optimizations
 * - Production-grade monitoring
 * 
 * @author Aurelian Salomon
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  type Firestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";

import { FirebaseConnectionManager } from './firebase-connection-manager';
import { FirebaseMessagingManager } from './firebase-messaging-manager';

// Enhanced Firebase configuration with validation
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Configuration validation
const validateFirebaseConfig = (): void => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase configuration:', missing);
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }

  console.log('✅ Firebase configuration validated');
};

// Initialize Firebase app with error handling
const initializeFirebaseApp = (): FirebaseApp => {
  try {
    validateFirebaseConfig();
    
    if (getApps().length === 0) {
      console.log('🔥 Initializing Firebase app...');
      return initializeApp(firebaseConfig);
    } else {
      console.log('🔥 Using existing Firebase app');
      return getApp();
    }
  } catch (error) {
    console.error('❌ Firebase app initialization failed:', error);
    throw error;
  }
};

// Initialize Firestore with enhanced settings
const initializeEnhancedFirestore = (app: FirebaseApp): Firestore => {
  try {
    // Use initializeFirestore for better control over settings
    const db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: false, // Use WebSockets for better performance
      ignoreUndefinedProperties: true,
    });

    console.log('✅ Enhanced Firestore initialized');
    return db;
  } catch (error: any) {
    // Fallback to standard initialization if enhanced fails
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Falling back to standard Firestore initialization');
      return getFirestore(app);
    }
    throw error;
  }
};

// Service instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

// Manager instances
let connectionManager: FirebaseConnectionManager | null = null;
let messagingManager: FirebaseMessagingManager | null = null;

// Initialize all Firebase services
const initializeFirebaseServices = (): void => {
  try {
    // Initialize app
    app = initializeFirebaseApp();
    
    // Initialize services
    auth = getAuth(app);
    db = initializeEnhancedFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Connect to emulators in development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      connectToEmulators();
    }

    // Initialize managers
    if (db) {
      connectionManager = FirebaseConnectionManager.getInstance(db);
    }
    
    messagingManager = FirebaseMessagingManager.getInstance();

    console.log('✅ All Firebase services initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize Firebase services:', error);
    
    // Set services to null to prevent usage
    app = null;
    auth = null;
    db = null;
    storage = null;
    functions = null;
    connectionManager = null;
    messagingManager = null;
  }
};

// Connect to Firebase emulators for development
const connectToEmulators = (): void => {
  try {
    if (db && typeof window !== 'undefined') {
      // Only connect if not already connected
      // Note: In production this would be disabled
      console.log('🔧 Development mode: Emulators available but not connected');
    }
  } catch (error) {
    console.log('ℹ️ Emulators not available or already connected');
  }
};

// Enhanced error handling for Cloud Functions
const createSecureCallable = (functionName: string) => {
  if (!functions) {
    console.error(`❌ Functions not initialized, cannot call ${functionName}`);
    return async () => {
      throw new Error('Firebase Functions not available');
    };
  }
  
  const callable = httpsCallable(functions, functionName);
  
  return async (data?: any) => {
    try {
      console.log(`🔄 Calling function: ${functionName}`);
      const result = await callable(data);
      console.log(`✅ Function ${functionName} completed successfully`);
      return result;
    } catch (error: any) {
      console.error(`❌ Function ${functionName} failed:`, error);
      
      // Enhanced error messages for common issues
      if (error.code === 'functions/unauthenticated') {
        throw new Error('Authentication required. Please log in and try again.');
      } else if (error.code === 'functions/permission-denied') {
        throw new Error('You do not have permission to perform this action.');
      } else if (error.code === 'functions/unavailable') {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      } else if (error.code === 'functions/timeout') {
        throw new Error('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'functions/deadline-exceeded') {
        throw new Error('Request took too long to complete. Please try again.');
      } else if (error.code === 'functions/resource-exhausted') {
        throw new Error('Service temporarily overloaded. Please try again later.');
      }
      
      // Re-throw original error for unknown cases
      throw error;
    }
  };
};

// Initialize services on module load
initializeFirebaseServices();

// Cloud function calls with enhanced error handling
export const acceptJobFunction = createSecureCallable('acceptJob');
export const inviteUserFunction = createSecureCallable('inviteUser');
export const updateAdminRolesFunction = createSecureCallable('updateAdminRoles');
export const getTeamStatsFunction = createSecureCallable('getTeamStats');
export const getDetailedAnalyticsFunction = createSecureCallable('getDetailedAnalytics');
export const generateAnalyticsReportFunction = createSecureCallable('generateAnalyticsReport');

// Debug function with enhanced error information
export const debugAcceptJobFunction = async (leadId: string): Promise<any> => {
  console.log(`🔍 Debug: Accepting job for lead ${leadId}`);
  
  try {
    // Check Firebase health first
    const isHealthy = await checkFirebaseHealthProduction();
    if (!isHealthy) {
      console.warn('⚠️ Firebase health check failed, attempting anyway...');
    }
    
    const result = await acceptJobFunction({ leadId });
    console.log('✅ Job acceptance successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Job acceptance failed:', error);
    throw error;
  }
};

// Production Firebase health check
export const checkFirebaseHealthProduction = async (): Promise<boolean> => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    return false;
  }
  
  try {
    // Simple query to test connection with timeout
    const { collection, limit, getDocs, query } = await import('firebase/firestore');
    const testQuery = query(collection(db, 'users'), limit(1));
    
    await Promise.race([
      getDocs(testQuery),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]);
    
    console.log('✅ Firebase connection healthy');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection unhealthy:', error);
    
    // Attempt to recover connection
    if (connectionManager) {
      console.log('🔄 Attempting connection recovery...');
      await connectionManager.forceReconnect();
    }
    
    return false;
  }
};

// Get connection manager instance
export const getConnectionManager = (): FirebaseConnectionManager | null => {
  return connectionManager;
};

// Get messaging manager instance
export const getMessagingManager = (): FirebaseMessagingManager | null => {
  return messagingManager;
};

// Connection state monitoring for React components
export const useFirebaseConnection = () => {
  const [isConnected, setIsConnected] = React.useState(true);
  const [connectionState, setConnectionState] = React.useState<any>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (connectionManager) {
      interval = setInterval(() => {
        const state = connectionManager?.getConnectionState();
        if (state) {
          setConnectionState(state);
          setIsConnected(state.isOnline && state.isFirestoreOnline);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return { isConnected, connectionState };
};

// Production Firebase cleanup function
export const cleanupFirebaseProduction = async (): Promise<void> => {
  console.log('🧹 Cleaning up Firebase services...');
  
  // Cleanup managers
  if (connectionManager) {
    connectionManager.destroy();
    connectionManager = null;
  }
  
  if (messagingManager) {
    messagingManager.destroy();
    messagingManager = null;
  }
  
  // Clear persistence if needed
  if (db) {
    try {
      const { clearIndexedDbPersistence } = await import('firebase/firestore');
      await clearIndexedDbPersistence(db);
      console.log('✅ Firebase persistence cleared');
    } catch (error) {
      console.warn('⚠️ Firebase persistence cleanup warning:', error);
    }
  }
  
  console.log('✅ Firebase cleanup completed');
};

// Setup cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupFirebaseProduction);
}

// Performance monitoring
export const monitorFirebasePerformance = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('📊 Firebase performance monitoring enabled');
  
  // Monitor connection state changes
  if (connectionManager) {
    setInterval(() => {
      const state = connectionManager?.getConnectionState();
      
      if (state && !state.isFirestoreOnline && state.reconnectAttempts > 0) {
        console.warn(`⚠️ Firebase connection issues detected. Reconnect attempts: ${state.reconnectAttempts}`);
      }
    }, 10000); // Check every 10 seconds
  }
};

// Start performance monitoring
monitorFirebasePerformance();

// Export Firebase services with null checks
export { app, auth, db, storage, functions };

// Re-export React for hooks
import React from 'react';

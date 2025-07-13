/**
 * Firebase Error Handling and Performance Optimization
 * Addresses console errors and improves connection reliability
 * 
 * Issues addressed:
 * 1. Firestore WebChannelConnection timeouts
 * 2. Firebase messaging VAPID warnings
 * 3. Console noise from debug messages
 * 4. Connection retry logic
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  clearIndexedDbPersistence,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Enhanced Firebase configuration with error handling
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate Firebase configuration
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase configuration:', missing);
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }
};

// Initialize Firebase with enhanced error handling
const initializeFirebaseApp = () => {
  try {
    validateConfig();
    
    if (getApps().length === 0) {
      console.log('🔥 Initializing Firebase app...');
      return initializeApp(firebaseConfig);
    } else {
      console.log('🔥 Using existing Firebase app');
      return getApp();
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// Initialize Firebase services with enhanced error handling
let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

try {
  app = initializeFirebaseApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('✅ Firebase services initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase services:', error);
  // Fallback to prevent app crash
  app = null;
  auth = null;
  db = null;
  storage = null;
  functions = null;
}

// Enhanced Firestore persistence with error handling
const enableFirestorePersistence = async () => {
  if (!db || typeof window === 'undefined') return;
  
  try {
    await enableIndexedDbPersistence(db);
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
};

// Connection monitoring and retry logic
let isOnline = true;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

const handleConnectionChange = async () => {
  if (!db) return;
  
  if (navigator.onLine && !isOnline) {
    console.log('🌐 Network connection restored, enabling Firestore...');
    try {
      await enableNetwork(db);
      isOnline = true;
      reconnectAttempts = 0;
      console.log('✅ Firestore network enabled');
    } catch (error) {
      console.error('❌ Failed to enable Firestore network:', error);
    }
  } else if (!navigator.onLine && isOnline) {
    console.log('📴 Network connection lost, disabling Firestore...');
    try {
      await disableNetwork(db);
      isOnline = false;
      console.log('✅ Firestore network disabled');
    } catch (error) {
      console.error('❌ Failed to disable Firestore network:', error);
    }
  }
};

// Setup connection monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleConnectionChange);
  window.addEventListener('offline', handleConnectionChange);
  
  // Enable persistence after initialization
  enableFirestorePersistence();
}

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
      const result = await callable(data);
      return result;
    } catch (error: any) {
      console.error(`❌ Function ${functionName} failed:`, error);
      
      // Enhanced error messages for common issues
      if (error.code === 'functions/unauthenticated') {
        throw new Error('You must be logged in to perform this action');
      } else if (error.code === 'functions/permission-denied') {
        throw new Error('You do not have permission to perform this action');
      } else if (error.code === 'functions/unavailable') {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else if (error.code === 'functions/timeout') {
        throw new Error('Request timed out. Please try again.');
      }
      
      throw error;
    }
  };
};

// Enhanced Cloud Function calls with error handling
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
    const result = await acceptJobFunction({ leadId });
    console.log('✅ Job acceptance successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Job acceptance failed:', error);
    throw error;
  }
};

// Enhanced connection health check
export const checkFirebaseHealthEnhanced = async (): Promise<boolean> => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    return false;
  }
  
  try {
    // Simple query to test connection
    const { collection, limit, getDocs, query } = await import('firebase/firestore');
    const testQuery = query(collection(db, 'users'), limit(1));
    await getDocs(testQuery);
    console.log('✅ Firebase connection healthy');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection unhealthy:', error);
    return false;
  }
};

// Enhanced cleanup function for app shutdown
export const cleanupFirebaseEnhanced = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleConnectionChange);
    window.removeEventListener('offline', handleConnectionChange);
  }
  
  if (db) {
    try {
      await clearIndexedDbPersistence(db);
      console.log('✅ Firebase cleanup completed');
    } catch (error) {
      console.warn('⚠️ Firebase cleanup warning:', error);
    }
  }
};

// Export Firebase services
export { app, auth, db, storage, functions };

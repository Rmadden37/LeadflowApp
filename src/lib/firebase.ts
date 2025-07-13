import {initializeApp, getApps, getApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore, connectFirestoreEmulator} from "firebase/firestore";
import {getStorage} from "firebase/storage";
import {getFunctions, httpsCallable} from "firebase/functions";

// Firebase configuration - Using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Enhanced Firebase initialization with error handling
const initializeFirebaseWithErrorHandling = () => {
  try {
    // Validate configuration
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missing = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
    
    if (missing.length > 0) {
      console.error('❌ Missing Firebase configuration:', missing);
      throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
    }

    return !getApps().length ? initializeApp(firebaseConfig) : getApp();
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// Initialize Firebase with enhanced error handling
const app = initializeFirebaseWithErrorHandling();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Connect to emulator in development (commented out for now)
// if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log('🔥 Connected to Firestore emulator');
//   } catch (error) {
//     console.log('Firestore emulator already connected or not available');
//   }
// }

// Enhanced Cloud function calls with comprehensive error handling
const createEnhancedCallable = (functionName: string) => {
  const callable = httpsCallable(functions, functionName);
  
  return async (data?: any) => {
    try {
      console.log(`🔄 Calling function: ${functionName}${data ? ' with data' : ''}`);
      const result = await callable(data);
      console.log(`✅ Function ${functionName} completed successfully`);
      return result;
    } catch (error: any) {
      console.error(`❌ Function ${functionName} failed:`, error);
      
      // Enhanced error messages for common Firebase issues
      if (error.code === 'functions/unauthenticated') {
        throw new Error('Authentication required. Please log in and try again.');
      } else if (error.code === 'functions/permission-denied') {
        throw new Error('You do not have permission to perform this action.');
      } else if (error.code === 'functions/unavailable') {
        throw new Error('Service temporarily unavailable. Please try again in a moment.');
      } else if (error.code === 'functions/timeout' || error.code === 'functions/deadline-exceeded') {
        throw new Error('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'functions/resource-exhausted') {
        throw new Error('Service temporarily overloaded. Please try again later.');
      } else if (error.code === 'functions/cancelled') {
        throw new Error('Request was cancelled. Please try again.');
      } else if (error.code === 'functions/internal') {
        throw new Error('Internal server error. Please try again later.');
      }
      
      // Re-throw original error for unknown cases
      throw error;
    }
  };
};

// Cloud function calls with enhanced error handling
export const acceptJobFunction = createEnhancedCallable('acceptJob');
export const inviteUserFunction = createEnhancedCallable('inviteUser');
export const updateAdminRolesFunction = createEnhancedCallable('updateAdminRoles');
export const getTeamStatsFunction = createEnhancedCallable('getTeamStats');
export const getDetailedAnalyticsFunction = createEnhancedCallable('getDetailedAnalytics');
export const generateAnalyticsReportFunction = createEnhancedCallable('generateAnalyticsReport');

// Debug function with enhanced error information and health checking
export const debugAcceptJobFunction = async (leadId: string): Promise<any> => {
  console.log(`🔍 Debug: Accepting job for lead ${leadId}`);
  
  try {
    // Perform a quick health check first
    const healthCheck = await checkFirebaseHealth();
    if (!healthCheck) {
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

// Firebase health check function
export const checkFirebaseHealth = async (): Promise<boolean> => {
  try {
    // Simple query to test Firestore connection
    const { collection, limit, getDocs, query } = await import('firebase/firestore');
    const testQuery = query(collection(db, 'users'), limit(1));
    
    await Promise.race([
      getDocs(testQuery),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]);
    
    console.log('✅ Firebase health check passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase health check failed:', error);
    return false;
  }
};

// Connection monitoring for React components
export const useFirebaseConnection = () => {
  const [isConnected, setIsConnected] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    let mounted = true;
    
    const checkConnection = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      const connected = await checkFirebaseHealth();
      
      if (mounted) {
        setIsConnected(connected);
        setIsLoading(false);
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Listen to online/offline events
    const handleOnline = () => {
      if (mounted) {
        setIsConnected(true);
        checkConnection();
      }
    };
    
    const handleOffline = () => {
      if (mounted) {
        setIsConnected(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isConnected, isLoading };
};

export {app, auth, db, storage, functions};

// Re-export React for the hook
import React from 'react';

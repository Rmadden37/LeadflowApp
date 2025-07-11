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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
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

// Cloud function calls
export const acceptJobFunction = httpsCallable(functions, 'acceptJob');
export const inviteUserFunction = httpsCallable(functions, 'inviteUser');
export const updateAdminRolesFunction = httpsCallable(functions, 'updateAdminRoles');
export const getTeamStatsFunction = httpsCallable(functions, 'getTeamStats');
export const getDetailedAnalyticsFunction = httpsCallable(functions, 'getDetailedAnalytics');
export const generateAnalyticsReportFunction = httpsCallable(functions, 'generateAnalyticsReport');

// Debug function for job acceptance issues
export const debugAcceptJobFunction = async (leadId: string): Promise<any> => {
  const result = await acceptJobFunction({ leadId });
  return result;
};

export {app, auth, db, storage, functions};

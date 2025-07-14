"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User as FirebaseAuthUser } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import type { AppUser } from "@/types";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  teamId: string | null;
  role: AppUser["role"] | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password'];
  // Routes that should redirect if already authenticated
  const authRoutes = ['/login', '/signup'];

  // SIMPLIFIED: Single timeout for auth completion
  useEffect(() => {
    const authTimeout = setTimeout(() => {
      console.log('🚨 Auth timeout reached - forcing completion');
      setLoading(false);
      setInitialAuthChecked(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(authTimeout);
  }, []);

  // SETUP AUTH PERSISTENCE: Remember user login across sessions
  useEffect(() => {
    const setupAuthPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('✅ Auth persistence enabled - faster subsequent loads');
      } catch (error) {
        console.warn('⚠️ Could not enable auth persistence:', error);
        // Continue without persistence - not critical
      }
    };
    
    setupAuthPersistence();
  }, []);

  // MAIN AUTH LOGIC - Simplified and more reliable
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener');
    let unsubscribeUser: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      console.log('🔥 Auth state changed:', !!fbUser);
      setFirebaseUser(fbUser);
      
      // Cleanup previous subscription
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }
      
      if (!fbUser) {
        console.log('👤 No user - auth complete');
        setUser(null);
        setLoading(false);
        setInitialAuthChecked(true);
        return;
      }

      console.log('👤 Firebase user found:', fbUser.uid);
      
      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        
        // Set up real-time listener for user document
        unsubscribeUser = onSnapshot(
          userDocRef,
          async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = { uid: docSnapshot.id, ...docSnapshot.data() } as AppUser;
              console.log('✅ User data loaded:', userData.email);
              setUser(userData);
              setLoading(false);
              setInitialAuthChecked(true);
            } else {
              console.log('🤷 No user document - creating one');
              
              // Create user document
              const newUserData: AppUser = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
                role: 'setter',
                teamId: 'default-team',
                photoURL: fbUser.photoURL,
                phoneNumber: fbUser.phoneNumber,
                status: 'Off Duty',
              };
              
              await setDoc(userDocRef, newUserData);
              console.log('✅ User document created');
              // The onSnapshot will trigger again with the new document
            }
          },
          (error) => {
            console.error('❌ Firestore error:', error);
            // Still complete auth even if Firestore fails
            setUser(null);
            setLoading(false);
            setInitialAuthChecked(true);
          }
        );
      } catch (error) {
        console.error('❌ Auth setup error:', error);
        setLoading(false);
        setInitialAuthChecked(true);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listeners');
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // CENTRALIZED REDIRECT LOGIC - This handles all navigation
  useEffect(() => {
    // Don't redirect while still loading or before initial auth check
    if (loading || !initialAuthChecked) {
      return;
    }

    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthRoute = authRoutes.includes(pathname);

    console.log('🚦 Redirect check:', {
      pathname,
      hasUser: !!user,
      isPublicRoute,
      isAuthRoute,
      loading
    });

    if (user) {
      // User is authenticated
      if (isAuthRoute) {
        // User is on login/signup but already authenticated
        console.log('➡️ Redirecting authenticated user from auth page to dashboard');
        router.replace('/dashboard');
      }
      // If user is authenticated and on a protected route, let them stay
    } else {
      // User is not authenticated
      if (!isPublicRoute) {
        // User is on a protected route but not authenticated
        console.log('➡️ Redirecting unauthenticated user to login');
        router.replace('/login');
      }
      // If user is not authenticated and on a public route, let them stay
    }
  }, [user, loading, initialAuthChecked, pathname, router]);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setInitialAuthChecked(false);
      console.log('➡️ Redirecting to login after logout');
      router.push("/login");
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    firebaseUser,
    user,
    loading,
    teamId: user?.teamId || null,
    role: user?.role || null,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
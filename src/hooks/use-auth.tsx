"use client";

import type {User as FirebaseAuthUser} from "firebase/auth";
import {onAuthStateChanged, signOut as firebaseSignOut} from "firebase/auth";
import {doc, onSnapshot, setDoc, getDoc} from "firebase/firestore";
import {useRouter, usePathname} from "next/navigation";
import type {ReactNode} from "react";
import React, {createContext, useContext, useEffect, useState} from "react";
import type {AppUser} from "@/types";
import {auth, db} from "@/lib/firebase";
import {Loader2} from "lucide-react";

interface AuthContextType {
  firebaseUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  teamId: string | null;
  role: AppUser["role"] | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('⏰ Auth loading timeout reached, forcing loading to false');
      if (loading && !initialAuthChecked) {
        console.log('🚨 Forcing auth check complete due to timeout');
        setLoading(false);
        setInitialAuthChecked(true);
      }
    }, 2000); // Reduced to 2 seconds

    return () => clearTimeout(timeout);
  }, [loading, initialAuthChecked]);

  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener');
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      console.log('🔥 Firebase auth state changed:', !!fbUser);
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        setInitialAuthChecked(true);
        return; // Explicitly return undefined
      }

      const userDocRef = doc(db, "users", fbUser.uid);
      const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const userData = {uid: doc.id, ...doc.data()} as AppUser;
          console.log('👤 User data from Firestore:', {email: userData.email, role: userData.role});
          setUser(userData);
        } else {
          console.log('🤷 User not found in Firestore, but authenticated.');
          setUser(null);
        }
        setLoading(false);
        setInitialAuthChecked(true);
      });

      // This return is for the onAuthStateChanged cleanup
      return () => {
        console.log('🧹 Unsubscribing from user snapshot');
        unsubscribeSnapshot();
      };
    });

    return () => {
      console.log('🔥 Cleaning up Firebase auth listener');
      unsubscribeAuth();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    router.push("/login");
  };

  const value = {
    firebaseUser,
    user,
    loading: loading || !initialAuthChecked,
    teamId: user?.teamId || null,
    role: user?.role || null,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

export default function HomePage() {
  const { user, loading, firebaseUser } = useAuth();
  const router = useRouter();
  const [debugMode, setDebugMode] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Enable debug mode after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebugMode(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Set timeout flag
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // MAIN NAVIGATION LOGIC
  useEffect(() => {
    console.log('HomePage effect:', { loading, user: !!user, firebaseUser: !!firebaseUser });
    
    if (!loading) {
      if (user) {
        console.log('✅ Redirecting to dashboard');
        router.replace("/dashboard");
      } else {
        console.log('❌ Redirecting to login');
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // EMERGENCY TIMEOUT: Force navigation if auth takes too long
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.log('🚨 EMERGENCY: Auth taking too long, forcing navigation');
        if (firebaseUser) {
          console.log('🔄 Has Firebase user, going to dashboard');
          router.replace("/dashboard");
        } else {
          console.log('🔄 No Firebase user, going to login');
          router.replace("/login");
        }
      }
    }, 4000); // 4 second emergency timeout

    return () => clearTimeout(emergencyTimeout);
  }, [loading, firebaseUser, router]);

  const handleForceRefresh = () => {
    window.location.reload();
  };

  const handleForceNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center max-w-md px-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <h1 className="text-white text-xl font-semibold mb-2">Loading LeadFlow</h1>
        <p className="text-gray-400 mb-4">Please wait while we set up your account...</p>

        {/* DEBUG INFO */}
        {debugMode && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left text-sm">
            <div className="text-yellow-400 font-medium mb-2">Debug Info:</div>
            <div className="space-y-1 text-gray-300">
              <div>Loading: {loading.toString()}</div>
              <div>Firebase User: {firebaseUser ? '✅' : '❌'}</div>
              <div>App User: {user ? '✅' : '❌'}</div>
              {firebaseUser && <div>UID: {firebaseUser.uid.slice(0, 8)}...</div>}
              {user && <div>Role: {user.role}</div>}
              {user && <div>Team: {user.teamId}</div>}
            </div>
          </div>
        )}

        {/* EMERGENCY ACTIONS */}
        {(debugMode && timeoutReached) && (
          <div className="space-y-2">
            <div className="text-red-400 text-sm mb-3">
              ⚠️ Taking too long? Try these options:
            </div>
            <button
              onClick={handleForceRefresh}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleForceNavigate('/login')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                Go to Login
              </button>
              <button
                onClick={() => handleForceNavigate('/dashboard')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
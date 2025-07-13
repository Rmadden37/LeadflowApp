"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/hooks/use-auth";
import {Loader2} from "lucide-react";

export default function HomePage() {
  const {user, loading} = useAuth();
  const router = useRouter();
  const [forceRedirect, setForceRedirect] = useState(false);

  // Force redirect after 3 seconds if still loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('🚨 Forcing redirect due to loading timeout');
        setForceRedirect(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (!loading || forceRedirect) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router, forceRedirect]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-white text-lg mb-2">Loading LeadFlow...</p>
        <p className="text-gray-400 text-sm">
          {loading ? 'Checking authentication...' : 'Redirecting...'}
        </p>
        {forceRedirect && (
          <p className="text-yellow-400 text-sm mt-2">Force redirect active</p>
        )}
        <div className="mt-4 text-xs text-gray-500">
          User: {user ? 'Authenticated' : 'Not authenticated'} | 
          Loading: {loading ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
  );
}

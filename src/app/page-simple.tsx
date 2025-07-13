"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('HomePage: loading =', loading, 'user =', !!user);
    
    if (!loading) {
      if (user) {
        console.log('Redirecting to dashboard');
        router.replace("/dashboard");
      } else {
        console.log('Redirecting to login');
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-white text-lg">Loading LeadFlow...</p>
        <p className="text-gray-400 text-sm mt-2">
          Loading: {loading ? 'true' : 'false'} | User: {user ? 'authenticated' : 'none'}
        </p>
      </div>
    </div>
  );
}

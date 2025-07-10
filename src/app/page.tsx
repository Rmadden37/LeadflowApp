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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

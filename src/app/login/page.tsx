
"use client";

import {useAuth} from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";
import {Loader2} from "lucide-react";

export default function LoginPage() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, let useAuth handle the redirect
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-auth-page className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4 overflow-hidden">
      {/* Atmospheric Background Effects */}
      
      {/* Primary Orb - Top Right */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 opacity-30 pointer-events-none animate-[breathe_4s_ease-in-out_infinite]"
        style={{
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, rgba(45, 212, 191, 0.2) 30%, transparent 70%)',
        }}
      />
      
      {/* Secondary Orb - Bottom Left */}
      <div 
        className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none animate-[breathe_6s_ease-in-out_infinite_1s]"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.15) 40%, transparent 70%)',
        }}
      />
      
      {/* Accent Orb - Top Left */}
      <div 
        className="absolute top-20 left-20 w-64 h-64 opacity-15 pointer-events-none animate-[breathe_5s_ease-in-out_infinite_2s]"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)',
        }}
      />
      
      {/* Warm Accent - Center Right */}
      <div 
        className="absolute top-1/2 right-10 w-48 h-48 opacity-10 pointer-events-none animate-[breathe_7s_ease-in-out_infinite_3s]"
        style={{
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, rgba(249, 115, 22, 0.08) 60%, transparent 80%)',
        }}
      />
      
      {/* Atmospheric Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-blue-400/30 rounded-full animate-[float_6s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-purple-400/25 rounded-full animate-[float_10s_ease-in-out_infinite_4s]" />
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-orange-400/20 rounded-full animate-[float_9s_ease-in-out_infinite_1s]" />
      </div>
      
      {/* Layered Shadows for Depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-blue-500/5" />
      </div>
      
      {/* Enhanced LeadFlow Brand */}
      <div className="mb-12 flex items-center justify-center text-primary relative z-10">
        <h1 className="text-6xl font-bold font-headline tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent drop-shadow-sm">
          LeadFlow
        </h1>
      </div>
      
      <LoginForm />
    </div>
  );
}

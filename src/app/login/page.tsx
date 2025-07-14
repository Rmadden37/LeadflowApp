
"use client";

import {useAuth} from "@/hooks/use-auth";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  // If user is already logged in, let useAuth handle the redirect
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary border-r-transparent" />
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
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.4) 0%, rgba(0, 122, 255, 0.2) 30%, transparent 70%)',
        }}
      />
      
      {/* Secondary Orb - Bottom Left */}
      <div 
        className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none animate-[breathe_6s_ease-in-out_infinite_1s]"
        style={{
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.35) 0%, rgba(0, 122, 255, 0.15) 40%, transparent 70%)',
        }}
      />
      
      {/* Accent Orb - Top Left */}
      <div 
        className="absolute top-20 left-20 w-64 h-64 opacity-15 pointer-events-none animate-[breathe_5s_ease-in-out_infinite_2s]"
        style={{
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.3) 0%, rgba(0, 122, 255, 0.1) 50%, transparent 70%)',
        }}
      />
      
      {/* Warm Accent - Center Right */}
      <div 
        className="absolute top-1/2 right-10 w-48 h-48 opacity-10 pointer-events-none animate-[breathe_7s_ease-in-out_infinite_3s]"
        style={{
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.25) 0%, rgba(0, 122, 255, 0.08) 60%, transparent 80%)',
        }}
      />
      
      {/* Atmospheric Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-[#007AFF]/30 rounded-full animate-[float_6s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-[#007AFF]/25 rounded-full animate-[float_10s_ease-in-out_infinite_4s]" />
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-[#007AFF]/20 rounded-full animate-[float_9s_ease-in-out_infinite_1s]" />
      </div>
      
      {/* Layered Shadows for Depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#007AFF]/5 via-transparent to-[#007AFF]/5" />
      </div>
      
      {/* Enhanced LeadFlow Brand - iOS SF Pro Display */}
      <div className="mb-12 flex items-center justify-center relative z-50">
        <h1 
          className="text-7xl md:text-8xl font-black tracking-tight text-white drop-shadow-2xl select-none"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 0.9,
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 255, 255, 0.1)'
          }}
        >
          LeadFlow
        </h1>
      </div>
      
      <LoginForm />
    </div>
  );
}


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
      {/* Breathing Radial Gradient Spotlight */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 opacity-30 pointer-events-none animate-[breathe_4s_ease-in-out_infinite]"
        style={{
          background: 'radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, rgba(45, 212, 191, 0.2) 30%, transparent 70%)',
        }}
      />
      
      {/* Enhanced LeadFlow Brand */}
      <div className="mb-12 flex items-center justify-center text-primary relative z-10">
        <h1 className="text-6xl font-bold font-headline tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
          LeadFlow
        </h1>
      </div>
      
      <LoginForm />
    </div>
  );
}

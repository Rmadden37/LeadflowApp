
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
      <div className="mb-8 flex items-center space-x-4 text-primary">
        <h1 className="text-4xl font-bold font-headline tracking-tight">LeadFlow</h1>
      </div>
      <LoginForm />
    </div>
  );
}

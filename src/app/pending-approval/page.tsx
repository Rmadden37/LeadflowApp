"use client";

import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import InfinityLogo from "@/components/ui/infinity-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PendingApprovalPage() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in, let useAuth handle the redirect
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in but not pending approval, they should be redirected by useAuth
  if (user && !user.isPendingApproval) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center space-x-4 text-primary">
        <InfinityLogo size={56} className="drop-shadow-xl" />
        <h1 className="text-4xl font-bold font-headline tracking-tight">LeadFlow</h1>
      </div>
      
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <AlertCircle className="mr-2 h-6 w-6 text-yellow-500" />
            Account Pending Approval
          </CardTitle>
          <CardDescription>
            Your account has been created successfully but requires manager approval before you can access the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Registration Complete</AlertTitle>
            <AlertDescription>
              Thank you for registering. A manager will review your account and approve it shortly.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p>What happens next:</p>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>A manager will review your information</li>
              <li>Once approved, you'll be able to access the system</li>
              <li>You will be able to log in with your credentials</li>
            </ol>
          </div>
          
          <Button onClick={handleLogout} className="w-full mt-4">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, CheckCircle } from "lucide-react";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is no longer pending, redirect them
    if (user && user.status !== "pending_approval") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-black/50 border-gray-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-orange-500/10">
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your account has been created and is awaiting manager approval
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <CheckCircle className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-1">Account Created Successfully</h3>
              <p className="text-sm text-gray-400">
                Your signup request has been submitted and is being reviewed by your team manager.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Mail className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-1">What Happens Next?</h3>
              <p className="text-sm text-gray-400">
                You'll receive an email notification once your account is approved. 
                After approval, you can log in and access the LeadFlow system.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-800">
            <div className="text-center text-sm text-gray-400 mb-4">
              <p>Account: <span className="text-white font-medium">{user?.email}</span></p>
              <p>Team: <span className="text-white font-medium">{user?.teamId || 'N/A'}</span></p>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

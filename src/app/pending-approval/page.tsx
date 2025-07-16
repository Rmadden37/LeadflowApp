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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black p-4">
      <Card className="w-full max-w-md shadow-2xl bg-black/50 backdrop-blur-xl border border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/10 ring-1 ring-orange-500/20">
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your account has been created and is awaiting team manager approval
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 ring-1 ring-blue-500/20 backdrop-blur-sm">
              <CheckCircle className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-2">Account Created Successfully</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your signup request has been submitted and is being reviewed by your team manager.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 ring-1 ring-orange-500/20 backdrop-blur-sm">
              <Mail className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-2">What Happens Next?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                You'll receive an email notification once your account is approved. 
                After approval, you can log in and access the LeadFlow system with full permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 ring-1 ring-purple-500/20 backdrop-blur-sm">
              <div className="h-6 w-6 mx-auto mb-2 rounded-full bg-purple-400/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
              </div>
              <h3 className="font-semibold text-purple-400 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Contact your team manager if you have questions about your approval status or need assistance.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-800/50">
            <div className="text-center text-sm text-gray-400 mb-4 space-y-1">
              <p><span className="text-gray-500">Account:</span> <span className="text-white font-medium">{user?.email}</span></p>
              <p><span className="text-gray-500">Team:</span> <span className="text-white font-medium">{user?.teamId || 'N/A'}</span></p>
              <p><span className="text-gray-500">Status:</span> <span className="text-orange-400 font-medium">Pending Approval</span></p>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-gray-600/50 text-gray-300 hover:bg-gray-800/50 hover:border-gray-500 backdrop-blur-sm transition-all duration-200"
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

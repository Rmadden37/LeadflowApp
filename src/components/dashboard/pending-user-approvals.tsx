"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserPlus, CheckCircle, AlertTriangle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppUser } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function PendingUserApprovals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApprovals, setProcessingApprovals] = useState<{ [key: string]: boolean }>({});

  // Load teams for displaying team names
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData);
    });

    return () => unsubscribe();
  }, []);

  // Load pending users
  useEffect(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      setLoading(true);
      const pendingUsersQuery = query(
        collection(db, "users"),
        where("isPendingApproval", "==", true)
      );
      
      const unsubscribe = onSnapshot(pendingUsersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() } as AppUser));
        
        setPendingUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching pending users:", error);
        toast({
          title: "Error",
          description: "Could not fetch pending users.",
          variant: "destructive",
        });
        setLoading(false);
      });
      
      return () => unsubscribe();
    } else {
      setLoading(false);
      setPendingUsers([]);
    }
  }, [user, toast]);

  // Handler for approving a user
  const handleApproveUser = async (userId: string) => {
    if (!user || (user.role !== "manager" && user.role !== "admin")) {
      toast({
        title: "Unauthorized",
        description: "Only managers and admins can approve users.",
        variant: "destructive",
      });
      return;
    }

    setProcessingApprovals(prev => ({ ...prev, [userId]: true }));
    
    try {
      const approveUserFn = httpsCallable(functions, 'approveUser');
      await approveUserFn({ userId });
      
      toast({
        title: "User Approved",
        description: "The user can now access the system.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast({
        title: "Approval Failed",
        description: error?.message || "Could not approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingApprovals(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Helper function to get initials from display name or email
  const getInitials = (user: AppUser) => {
    if (user.displayName) {
      return user.displayName.substring(0, 2).toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  // If user isn't a manager or admin, don't show anything
  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return null;
  }

  return (
    <Card className="frosted-glass-card mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <UserPlus className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Pending Approval Requests</CardTitle>
            <CardDescription>
              New users who have signed up are waiting for your approval
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-light)]" />
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3 opacity-80" />
            <p className="text-[var(--text-primary)] text-lg font-medium">No Pending Approvals</p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              All user signup requests have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((pendingUser) => (
              <div
                key={pendingUser.uid}
                className="p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* User Info Section */}
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 border-2 border-yellow-500/30">
                      <AvatarImage src={pendingUser.avatarUrl || undefined} alt={pendingUser.displayName || pendingUser.email || "User"} />
                      <AvatarFallback className="bg-yellow-500/20 text-yellow-500 font-bold">
                        {getInitials(pendingUser)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-base text-[var(--text-primary)] truncate">
                          {pendingUser.displayName || pendingUser.email || "Unnamed User"}
                        </p>
                        <span className="px-2 py-0.5 text-xs rounded-md bg-yellow-500/20 text-yellow-400 font-medium whitespace-nowrap">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mb-2 truncate">{pendingUser.email}</p>
                      
                      {/* Role and Team Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          {pendingUser.role.charAt(0).toUpperCase() + pendingUser.role.slice(1)}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[var(--text-secondary)]/20 text-[var(--text-secondary)] border border-[var(--text-secondary)]/30">
                          <Building2 className="mr-1.5 h-3.5 w-3.5" />
                          {teams.find(t => t.id === pendingUser.teamId)?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleApproveUser(pendingUser.uid)}
                      disabled={!!processingApprovals[pendingUser.uid]}
                      className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-md transition-all duration-200 w-full sm:w-auto"
                    >
                      {processingApprovals[pendingUser.uid] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {pendingUsers.length > 0 && (
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center text-sm text-[var(--text-secondary)]">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
              <span>
                Approved users will gain immediate access to the system
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

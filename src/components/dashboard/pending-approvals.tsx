"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  
  
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingApproval {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamId: string;
  teamName: string;
  requestedAt: any;
  status: "pending" | "approved" | "rejected";
  userData: {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber?: string;
    company: string;
    region: string;
    team: string;
    role: string;
  };
}

export default function PendingApprovals() {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  useEffect(() => {
    if (!managerUser) return;

    // For admins, show all pending approvals
    // For managers, show only approvals for their team
    const isAdmin = managerUser.role === "admin";
    
    let approvalsQuery;
    if (isAdmin) {
      approvalsQuery = query(
        collection(db, "pending_approvals"),
        where("status", "==", "pending")
      );
    } else {
      // Managers can only approve for their team
      approvalsQuery = query(
        collection(db, "pending_approvals"),
        where("status", "==", "pending"),
        where("teamId", "==", managerUser.teamId)
      );
    }

    const unsubscribe = onSnapshot(approvalsQuery, (snapshot) => {
      const approvals: PendingApproval[] = [];
      snapshot.forEach((doc) => {
        approvals.push({ id: doc.id, ...doc.data() } as PendingApproval);
      });
      
      // Sort by most recent first
      approvals.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      
      setPendingApprovals(approvals);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [managerUser]);

  const handleApproveUser = async (approval: PendingApproval) => {
    if (!managerUser) return;
    
    setProcessingApproval(approval.id);
    
    try {
      const batch = writeBatch(db);
      
      // Update user document to set proper role and activate account
      const userRef = doc(db, "users", approval.userId);
      batch.update(userRef, {
        role: "setter", // Default role for new users
        status: "active",
        teamId: approval.teamId, // CRITICAL FIX: Preserve the teamId from signup
        approvedBy: managerUser.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update pending approval status
      const approvalRef = doc(db, "pending_approvals", approval.id);
      batch.update(approvalRef, {
        status: "approved",
        approvedBy: managerUser.uid,
        approvedAt: serverTimestamp()
      });
      
      await batch.commit();
      
      toast({
        title: "User Approved",
        description: `${approval.userName} has been approved and can now access the system.`,
      });
      
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleRejectUser = async (approval: PendingApproval) => {
    if (!managerUser) return;
    
    setProcessingApproval(approval.id);
    
    try {
      const batch = writeBatch(db);
      
      // Update user document to rejected status
      const userRef = doc(db, "users", approval.userId);
      batch.update(userRef, {
        status: "rejected",
        rejectedBy: managerUser.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update pending approval status
      const approvalRef = doc(db, "pending_approvals", approval.id);
      batch.update(approvalRef, {
        status: "rejected",
        rejectedBy: managerUser.uid,
        rejectedAt: serverTimestamp()
      });
      
      await batch.commit();
      
      toast({
        title: "User Rejected",
        description: `${approval.userName}'s signup request has been rejected.`,
      });
      
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-light)]" />
      </div>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Card className="bg-[var(--background)]/50 border-[var(--glass-border)]">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No Pending Approvals
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            All signup requests have been processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <Clock className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            Pending Approvals
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Review and approve new user signup requests ({pendingApprovals.length} pending)
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.map((approval) => (
          <Card key={approval.id} className="bg-[var(--background)]/50 border-[var(--glass-border)]">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* User Info */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={undefined} alt={approval.userName} />
                    <AvatarFallback className="bg-[var(--accent-primary)]/20 text-[var(--accent-light)]">
                      {approval.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                        {approval.userName}
                      </h4>
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{approval.userEmail}</span>
                      </div>
                      
                      {approval.userData.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{approval.userData.phoneNumber}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{approval.userData.company} • {approval.userData.region}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Team: {approval.teamName}</span>
                      </div>
                      
                      <div className="text-xs text-[var(--text-secondary)] mt-2">
                        Requested: {approval.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectUser(approval)}
                    disabled={processingApproval === approval.id}
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  >
                    {processingApproval === approval.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => handleApproveUser(approval)}
                    disabled={processingApproval === approval.id}
                    className="bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                  >
                    {processingApproval === approval.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

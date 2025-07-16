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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Clock, 
  Mail, 
  Phone, 
  Building2, 
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for this component
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

interface PendingApprovalsModalProps {
  triggerClassName?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

function PendingApprovalsModal({ 
  triggerClassName = "", 
  triggerVariant = "outline",
  triggerSize = "default"
}: PendingApprovalsModalProps) {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available roles for assignment (filtered based on manager's role)
  const getAvailableRoles = () => {
    const baseRoles = [
      { value: "setter", label: "Setter" },
      { value: "closer", label: "Closer" }
    ];
    
    // Only admins can assign manager and admin roles
    if (managerUser?.role === "admin") {
      baseRoles.push(
        { value: "manager", label: "Manager" },
        { value: "admin", label: "Admin" }
      );
    }
    
    return baseRoles;
  };

  useEffect(() => {
    if (!managerUser || !isModalOpen) return;

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

    const unsubscribe = onSnapshot(approvalsQuery, (snapshot: any) => {
      const approvals: PendingApproval[] = [];
      snapshot.forEach((docSnap: any) => {
        approvals.push({ id: docSnap.id, ...docSnap.data() } as PendingApproval);
      });
      
      // Sort by most recent first
      approvals.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      
      setPendingApprovals(approvals);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [managerUser, isModalOpen]);

  const handleApproveUser = async (approval: PendingApproval) => {
    if (!managerUser) return;
    
    // Get selected role or default to setter
    const selectedRole = selectedRoles[approval.id] || "setter";
    
    setProcessingApproval(approval.id);
    
    try {
      const batch = writeBatch(db);
      
      // Update user document to set selected role and activate account
      const userRef = doc(db, "users", approval.userId);
      batch.update(userRef, {
        role: selectedRole,
        status: "active",
        teamId: approval.teamId, // CRITICAL FIX: Preserve the teamId from signup
        approvedBy: managerUser.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // If the role is closer, manager, or admin, also create closer record
      if (["closer", "manager", "admin"].includes(selectedRole)) {
        const closerRef = doc(db, "closers", approval.userId);
        batch.set(closerRef, {
          uid: approval.userId,
          name: approval.userName,
          status: "Off Duty",
          teamId: approval.teamId,
          role: selectedRole,
          avatarUrl: null,
          phone: approval.userData.phoneNumber || null,
          lineupOrder: 999,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Update pending approval status
      const approvalRef = doc(db, "pending_approvals", approval.id);
      batch.update(approvalRef, {
        status: "approved",
        approvedBy: managerUser.uid,
        approvedAt: serverTimestamp(),
        assignedRole: selectedRole
      });
      
      await batch.commit();
      
      toast({
        title: "User Approved",
        description: `${approval.userName} has been approved as ${selectedRole} and can now access the system.`,
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

  // Don't render if user doesn't have permission
  if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={triggerVariant} 
          size={triggerSize}
          className={triggerClassName}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Pending Approvals {loading ? "" : `(${pendingApprovals.length})`}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] bg-[var(--background)]/95 backdrop-blur-xl border-[var(--glass-border)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-400" />
            </div>
            Pending Approvals
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Review and approve new user signup requests
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[600px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-light)]" />
                <p className="text-sm text-[var(--text-secondary)]">Loading pending approvals...</p>
              </div>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No Pending Approvals
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                All signup requests have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="frosted-glass-card border border-[var(--glass-border)]">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-[var(--glass-border)]">
                          <AvatarImage src={undefined} alt={approval.userName} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)]/20 to-blue-500/10 text-[var(--accent-light)] font-semibold">
                            {approval.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                              {approval.userName}
                            </h4>
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                              <Clock className="h-3 w-3 mr-1.5" />
                              Pending
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Mail className="h-4 w-4 text-[var(--accent-light)]" />
                              <span className="truncate">{approval.userEmail}</span>
                            </div>
                            
                            {approval.userData.phoneNumber && (
                              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <Phone className="h-4 w-4 text-[var(--accent-light)]" />
                                <span>{approval.userData.phoneNumber}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Building2 className="h-4 w-4 text-[var(--accent-light)]" />
                              <span className="truncate">{approval.userData.company} • {approval.userData.region}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Users className="h-4 w-4 text-[var(--accent-light)]" />
                              <span>Team: {approval.teamName}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 text-xs text-[var(--text-secondary)]/70">
                            Requested: {approval.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-4 min-w-[200px]">
                        {/* Role Selection */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[var(--text-primary)] block">
                            Assign Role
                          </label>
                          <Select
                            value={selectedRoles[approval.id] || "setter"}
                            onValueChange={(value: string) => 
                              setSelectedRoles(prev => ({ ...prev, [approval.id]: value }))
                            }
                          >
                            <SelectTrigger className="w-full h-9 bg-[var(--background)]/20 border-[var(--glass-border)] backdrop-blur-sm hover:bg-[var(--background)]/30 transition-colors">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--background)]/95 backdrop-blur-xl border-[var(--glass-border)] shadow-2xl">
                              {getAvailableRoles().map((role: { value: string; label: string }) => (
                                <SelectItem 
                                  key={role.value} 
                                  value={role.value}
                                  className="text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 focus:bg-[var(--accent-primary)]/10"
                                >
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Approval Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleRejectUser(approval)}
                            disabled={processingApproval === approval.id}
                            size="sm"
                            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 backdrop-blur-sm transition-all duration-200"
                          >
                            {processingApproval === approval.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject
                          </Button>
                          
                          <Button
                            onClick={() => handleApproveUser(approval)}
                            disabled={processingApproval === approval.id}
                            size="sm"
                            className="w-full bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/30 backdrop-blur-sm transition-all duration-200"
                          >
                            {processingApproval === approval.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-2" />
                            )}
                            Approve as {selectedRoles[approval.id] || "Setter"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default PendingApprovalsModal;

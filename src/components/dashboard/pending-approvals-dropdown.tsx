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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Clock, 
  CheckCircle,
  XCircle,
  UserCheck,
  ChevronDown,
  Users
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

function PendingApprovalsDropdown() {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);

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
  }, [managerUser]);

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

  if (loading) {
    return (
      <Button variant="outline" disabled className="h-9">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Button variant="outline" disabled className="h-9">
        <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
        No Pending Approvals
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9">
          <Clock className="h-4 w-4 mr-2 text-orange-400" />
          Pending Approvals ({pendingApprovals.length})
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-96 max-h-96 overflow-y-auto bg-[var(--background)]/95 backdrop-blur-xl border-[var(--glass-border)] shadow-2xl"
        align="end"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--accent-light)]" />
          Signup Requests ({pendingApprovals.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {pendingApprovals.map((approval, index) => (
          <div key={approval.id}>
            <div className="p-3 space-y-3">
              {/* User Info Header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={approval.userName} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)]/20 to-blue-500/10 text-[var(--accent-light)] text-xs font-semibold">
                    {approval.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] text-sm truncate">
                    {approval.userName}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {approval.userEmail}
                  </div>
                </div>
              </div>

              {/* Team and Company Info */}
              <div className="text-xs text-[var(--text-secondary)] space-y-1">
                <div>Team: {approval.teamName}</div>
                <div>{approval.userData.company} • {approval.userData.region}</div>
              </div>

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
                  <SelectTrigger className="w-full h-8 bg-[var(--background)]/20 border-[var(--glass-border)] backdrop-blur-sm hover:bg-[var(--background)]/30 transition-colors">
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

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRejectUser(approval)}
                  disabled={processingApproval === approval.id}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 backdrop-blur-sm transition-all duration-200 text-xs"
                >
                  {processingApproval === approval.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Reject
                </Button>
                
                <Button
                  onClick={() => handleApproveUser(approval)}
                  disabled={processingApproval === approval.id}
                  size="sm"
                  className="flex-1 h-8 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/30 backdrop-blur-sm transition-all duration-200 text-xs"
                >
                  {processingApproval === approval.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <UserCheck className="h-3 w-3 mr-1" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
            
            {index < pendingApprovals.length - 1 && (
              <DropdownMenuSeparator />
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PendingApprovalsDropdown;

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
  const [dataLoaded, setDataLoaded] = useState(false);

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
      try {
        const approvals: PendingApproval[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          // Validate that required fields exist
          if (data && data.userName && data.userEmail && data.teamName) {
            approvals.push({ id: docSnap.id, ...data } as PendingApproval);
          } else {
            console.warn('Invalid pending approval data:', docSnap.id, data);
          }
        });
        
        // Sort by most recent first
        approvals.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
        
        setPendingApprovals(approvals);
        setLoading(false);
        setDataLoaded(true);
        
        // Debug logging
        console.log('Pending approvals loaded:', approvals.length, approvals);
      } catch (error) {
        console.error('Error processing pending approvals:', error);
        setLoading(false);
        setDataLoaded(true);
      }
    }, (error) => {
      console.error('Error fetching pending approvals:', error);
      setLoading(false);
      setDataLoaded(true);
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <UserPlus className="h-4 w-4" />
              {!loading && pendingApprovals.length > 0 && (
                <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center px-1 border-2 border-white shadow-sm">
                  {pendingApprovals.length > 99 ? '99+' : pendingApprovals.length}
                </div>
              )}
            </div>
            <span className="hidden sm:inline font-medium">
              Pending Approvals
            </span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[85vh] bg-white/95 backdrop-blur-2xl border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
        {/* iOS-style header */}
        <div className="relative bg-gradient-to-b from-white to-gray-50/80 px-6 py-6 border-b border-gray-200/30">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
          >
            <XCircle className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="pr-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              New Requests
            </h2>
            <p className="text-gray-600 text-sm">
              {loading ? "Loading..." : `${pendingApprovals.length} team member${pendingApprovals.length !== 1 ? 's' : ''} waiting for approval`}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
                <p className="text-gray-600 font-medium">Loading requests...</p>
              </div>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All Set!
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                No pending approvals right now. New signup requests will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <div className="px-6 py-4 space-y-6">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100/50">
                    {/* Person info */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {approval.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full border-3 border-white flex items-center justify-center">
                          <Clock className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                          {approval.userName}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 truncate">
                          {approval.userEmail}
                        </p>
                        
                        {/* Info grid */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm font-medium">Company</span>
                            <span className="text-gray-900 text-sm font-semibold">{approval.userData.company}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-500 text-sm font-medium">Team</span>
                            <span className="text-blue-600 text-sm font-semibold">{approval.teamName}</span>
                          </div>
                          {approval.userData.phoneNumber && (
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-500 text-sm font-medium">Phone</span>
                              <span className="text-gray-900 text-sm">{approval.userData.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Role selection */}
                    <div className="mb-6">
                      <label className="block text-gray-900 font-semibold text-sm mb-3">
                        Assign Role
                      </label>
                      <Select
                        value={selectedRoles[approval.id] || "setter"}
                        onValueChange={(value: string) => 
                          setSelectedRoles(prev => ({ ...prev, [approval.id]: value }))
                        }
                      >
                        <SelectTrigger className="w-full h-14 bg-white/90 backdrop-blur-xl border border-gray-300/60 text-gray-900 rounded-xl hover:bg-white hover:border-gray-400/80 transition-all duration-200 text-base font-medium shadow-md">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-300/60 shadow-2xl rounded-xl overflow-hidden z-50">
                          {getAvailableRoles().map((role: { value: string; label: string }) => (
                            <SelectItem 
                              key={role.value} 
                              value={role.value}
                              className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100 rounded-lg text-base font-medium py-3 transition-colors duration-150 cursor-pointer"
                            >
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={() => handleApproveUser(approval)}
                        disabled={processingApproval === approval.id}
                        className="w-full h-14 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-bold text-base shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {processingApproval === approval.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <UserCheck className="h-5 w-5" />
                        )}
                        Add to Team as {selectedRoles[approval.id] || "Setter"}
                      </button>
                      
                      <button
                        onClick={() => handleRejectUser(approval)}
                        disabled={processingApproval === approval.id}
                        className="w-full h-12 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-xl font-semibold text-base transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {processingApproval === approval.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                        Decline Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PendingApprovalsModal;

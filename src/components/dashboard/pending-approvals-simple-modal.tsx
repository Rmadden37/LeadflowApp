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
import { 
  Loader2, 
  Clock, 
  Mail, 
  Building2, 
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingUser {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamId: string;
  teamName: string;
  requestedAt: any;
  status: string;
  userData: {
    uid: string;
    displayName: string;
    email: string;
    phoneNumber?: string;
    company: string;
    region: string;
    team: string;
  };
}

interface PendingApprovalsSimpleModalProps {
  triggerClassName?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

export default function PendingApprovalsSimpleModal({ 
  triggerClassName = "", 
  triggerVariant = "outline",
  triggerSize = "default"
}: PendingApprovalsSimpleModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  // Available roles based on user permission
  const getAvailableRoles = () => {
    const roles = [
      { value: "setter", label: "Setter" },
      { value: "closer", label: "Closer" }
    ];
    
    if (user?.role === "admin") {
      roles.push(
        { value: "manager", label: "Manager" },
        { value: "admin", label: "Admin" }
      );
    }
    
    return roles;
  };

  // Load pending approvals
  useEffect(() => {
    if (!user || (user.role !== "manager" && user.role !== "admin")) {
      setIsLoading(false);
      return;
    }

    console.log("Setting up pending approvals listener for user:", user.email, "role:", user.role);

    let q;
    if (user.role === "admin") {
      // Admins see all pending approvals
      q = query(
        collection(db, "pending_approvals"),
        where("status", "==", "pending")
      );
    } else {
      // Managers see only their team's approvals
      q = query(
        collection(db, "pending_approvals"),
        where("status", "==", "pending"),
        where("teamId", "==", user.teamId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Pending approvals snapshot received, size:", snapshot.size);
      
      const users: PendingUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Pending approval data:", doc.id, data);
        
        users.push({
          id: doc.id,
          ...data
        } as PendingUser);
      });
      
      // Sort by most recent first
      users.sort((a, b) => {
        const aTime = a.requestedAt?.seconds || 0;
        const bTime = b.requestedAt?.seconds || 0;
        return bTime - aTime;
      });
      
      console.log("Processed pending users:", users.length);
      setPendingUsers(users);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading pending approvals:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleApprove = async (pendingUser: PendingUser) => {
    if (!user) return;

    const selectedRole = selectedRoles[pendingUser.id] || "setter";
    setProcessing(pendingUser.id);

    try {
      console.log("Approving user:", pendingUser.userName, "as", selectedRole);

      const batch = writeBatch(db);

      // Update user document
      const userRef = doc(db, "users", pendingUser.userId);
      batch.update(userRef, {
        role: selectedRole,
        status: "active",
        teamId: pendingUser.teamId,
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create closer record if needed
      if (["closer", "manager", "admin"].includes(selectedRole)) {
        const closerRef = doc(db, "closers", pendingUser.userId);
        batch.set(closerRef, {
          uid: pendingUser.userId,
          name: pendingUser.userName,
          status: "Off Duty",
          teamId: pendingUser.teamId,
          role: selectedRole,
          avatarUrl: null,
          phone: pendingUser.userData.phoneNumber || null,
          lineupOrder: 999,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Update pending approval
      const approvalRef = doc(db, "pending_approvals", pendingUser.id);
      batch.update(approvalRef, {
        status: "approved",
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        assignedRole: selectedRole
      });

      await batch.commit();

      toast({
        title: "User Approved",
        description: `${pendingUser.userName} has been approved as ${selectedRole}.`,
      });

    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Approval Failed", 
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (pendingUser: PendingUser) => {
    if (!user) return;

    setProcessing(pendingUser.id);

    try {
      console.log("Rejecting user:", pendingUser.userName);

      const batch = writeBatch(db);

      // Update user document
      const userRef = doc(db, "users", pendingUser.userId);
      batch.update(userRef, {
        status: "rejected",
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update pending approval
      const approvalRef = doc(db, "pending_approvals", pendingUser.id);
      batch.update(approvalRef, {
        status: "rejected",
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp()
      });

      await batch.commit();

      toast({
        title: "User Rejected",
        description: `${pendingUser.userName}'s request has been rejected.`,
      });

    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject user. Please try again.", 
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  // Don't render if user doesn't have permission
  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={triggerVariant} 
          size={triggerSize}
          className={triggerClassName}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Pending Approvals ({isLoading ? "..." : pendingUsers.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-400" />
            Pending Approvals
          </DialogTitle>
          <DialogDescription>
            Review and approve new user signup requests
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All signup requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" alt={pendingUser.userName} />
                      <AvatarFallback>
                        {pendingUser.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{pendingUser.userName}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {pendingUser.userEmail}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {pendingUser.userData?.company} • {pendingUser.userData?.region}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team: {pendingUser.teamName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium block mb-2">Assign Role</label>
                      <Select
                        value={selectedRoles[pendingUser.id] || "setter"}
                        onValueChange={(value) => 
                          setSelectedRoles(prev => ({ ...prev, [pendingUser.id]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableRoles().map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(pendingUser)}
                        disabled={processing === pendingUser.id}
                      >
                        {processing === pendingUser.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleApprove(pendingUser)}
                        disabled={processing === pendingUser.id}
                      >
                        {processing === pendingUser.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
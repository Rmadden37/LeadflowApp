"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot, collection, query, where, setDoc, deleteDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Mail, 
  Shield, 
  Users, 
  Loader2, 
  Save, 
  Camera,
  Eye,
  EyeOff,
  UserX,
  AlertTriangle
} from "lucide-react";
import type { AppUser, UserRole } from "@/types";

interface UpdateUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

const UpdateUserProfileModal = ({ isOpen, onClose, user }: UpdateUserProfileModalProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    email: user.email || "",
    role: user.role || "setter",
    teamId: user.teamId || ""
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  
  // Duty status state (for closers, managers, admins)
  const [dutyStatus, setDutyStatus] = useState<"On Duty" | "Off Duty">("Off Duty");
  const [loadingDutyStatus, setLoadingDutyStatus] = useState(true);
  const [updatingDutyStatus, setUpdatingDutyStatus] = useState(false);

  // User activation state
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Load teams - only show Empire (Team), TakeoverPros (Team), and Revolution (Team)
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      // Filter to only show the specific teams we want
      const allowedTeamIds = ['empire-team', 'takeoverpros', 'revolution'];
      const filteredTeams = teamsData.filter(team => 
        team.isActive && allowedTeamIds.includes(team.id)
      );
      
      setTeams(filteredTeams);
      setLoadingTeams(false);
    });
    return () => unsubscribe();
  }, []);

  // Load duty status for closers, managers, and admins
  useEffect(() => {
    const isCloserRole = ["closer", "manager", "admin"].includes(user.role);
    
    if (isCloserRole) {
      setLoadingDutyStatus(true);
      const closerDocRef = doc(db, "closers", user.uid);
      
      const unsubscribe = onSnapshot(closerDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDutyStatus(data.status || "Off Duty");
        } else {
          setDutyStatus("Off Duty");
        }
        setLoadingDutyStatus(false);
      }, (error) => {
        console.error("Error loading duty status:", error);
        setDutyStatus("Off Duty");
        setLoadingDutyStatus(false);
      });

      return () => unsubscribe();
    } else {
      setDutyStatus("Off Duty");
      setLoadingDutyStatus(false);
    }
  }, [user.uid, user.role]);

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      displayName: user.displayName || "",
      email: user.email || "",
      role: user.role || "setter",
      teamId: user.teamId || ""
    });
  }, [user]);

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDutyToggle = async (checked: boolean) => {
    if (!currentUser) return;
    
    // Check permissions
    const canToggle = currentUser.uid === user.uid || 
                     currentUser.role === "manager" || 
                     currentUser.role === "admin";
    
    if (!canToggle) {
      toast({
        title: "Unauthorized",
        description: "You can only toggle your own duty status.",
        variant: "destructive"
      });
      return;
    }

    setUpdatingDutyStatus(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      const closerDocRef = doc(db, "closers", user.uid);
      
      // Try to update the document, create if it doesn't exist
      await updateDoc(closerDocRef, {
        status: newStatus,
        updatedAt: new Date()
      }).catch(async (error) => {
        if (error.code === 'not-found') {
          // Create the closer record if it doesn't exist
          await setDoc(closerDocRef, {
            uid: user.uid,
            name: user.displayName || user.email,
            role: user.role,
            teamId: user.teamId,
            status: newStatus,
            avatarUrl: user.avatarUrl || null,
            phone: null,
            lineupOrder: 999,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          throw error;
        }
      });

      setDutyStatus(newStatus); // Update local state immediately

      toast({
        title: "Status Updated",
        description: `${user.displayName || user.email} is now ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating duty status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update duty status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingDutyStatus(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!currentUser) return;

    // Check permissions
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      toast({
        title: "Unauthorized",
        description: "Only managers and admins can deactivate users.",
        variant: "destructive"
      });
      return;
    }

    // Prevent self-deactivation
    if (currentUser.uid === user.uid) {
      toast({
        title: "Action Not Allowed", 
        description: "You cannot deactivate your own account.",
        variant: "destructive"
      });
      return;
    }

    setIsDeactivating(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      const newStatus = user.status === "deactivated" ? "active" : "deactivated";
      
      await updateDoc(userDocRef, {
        status: newStatus,
        deactivatedBy: newStatus === "deactivated" ? currentUser.uid : null,
        deactivatedAt: newStatus === "deactivated" ? new Date() : null,
        reactivatedBy: newStatus === "active" ? currentUser.uid : null,
        reactivatedAt: newStatus === "active" ? new Date() : null,
        updatedAt: new Date()
      });

      // If deactivating a closer/manager/admin, set their duty status to Off Duty
      const isCloserRole = ["closer", "manager", "admin"].includes(user.role);
      if (newStatus === "deactivated" && isCloserRole) {
        const closerDocRef = doc(db, "closers", user.uid);
        await updateDoc(closerDocRef, {
          status: "Off Duty",
          deactivatedAt: new Date(),
          updatedAt: new Date()
        }).catch(() => {
          // Closer record might not exist, ignore error
        });
      }

      toast({
        title: newStatus === "deactivated" ? "User Deactivated" : "User Reactivated",
        description: `${user.displayName || user.email} has been ${newStatus === "deactivated" ? "deactivated" : "reactivated"} successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Update Failed",
        description: `Failed to ${user.status === "deactivated" ? "reactivate" : "deactivate"} user. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Check permissions
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      toast({
        title: "Unauthorized",
        description: "Only managers and admins can update user profiles.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: formData.displayName,
        role: formData.role,
        teamId: formData.teamId,
        updatedAt: new Date()
      });

      // Handle closer record based on role changes
      const isNewRoleCloser = ["closer", "manager", "admin"].includes(formData.role);
      const wasCloser = ["closer", "manager", "admin"].includes(user.role);

      if (isNewRoleCloser) {
        // Create or update closer record
        const closerDocRef = doc(db, "closers", user.uid);
        await updateDoc(closerDocRef, {
          name: formData.displayName || formData.email,
          role: formData.role,
          teamId: formData.teamId,
          status: dutyStatus, // Preserve current duty status
          updatedAt: new Date()
        }).catch(async () => {
          // If document doesn't exist, create it
          await setDoc(closerDocRef, {
            uid: user.uid,
            name: formData.displayName || formData.email,
            role: formData.role,
            teamId: formData.teamId,
            status: "Off Duty",
            avatarUrl: user.avatarUrl || null,
            phone: null,
            lineupOrder: 999,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      } else if (wasCloser && !isNewRoleCloser) {
        // Remove from closers if changing from closer role to setter
        const closerDocRef = doc(db, "closers", user.uid);
        await deleteDoc(closerDocRef).catch(() => {
          // Document might not exist, ignore error
        });
      }

      toast({
        title: "Profile Updated",
        description: `${formData.displayName || formData.email}'s profile has been updated successfully.`,
      });

      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (currentUser?.role === "admin") {
      return ["setter", "closer", "manager", "admin"];
    } else if (currentUser?.role === "manager") {
      return ["setter", "closer", "manager"];
    }
    return ["setter"];
  };

  const currentTeam = teams.find(t => t.id === formData.teamId);
  const showDutyToggle = ["closer", "manager", "admin"].includes(formData.role); // Show based on selected role

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto modal-background-fix">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <User className="h-5 w-5 text-[var(--accent-light)]" />
            </div>
            Update User Profile
          </DialogTitle>
          <DialogDescription>
            Manage profile information and settings for {user.displayName || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 pb-20">
          {/* User Avatar and Basic Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-[var(--glass-border)]">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-lg font-bold">
                  {user.displayName 
                    ? user.displayName.substring(0, 2).toUpperCase() 
                    : user.email?.substring(0, 2).toUpperCase() || "??"
                  }
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--background)] border border-[var(--glass-border)]">
                <Camera className="h-3 w-3 text-[var(--text-secondary)]" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {user.displayName || user.email}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                  <Shield className="mr-1 h-3 w-3" />
                  {user.role}
                </span>
                {currentTeam && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                    <Users className="mr-1 h-3 w-3" />
                    {currentTeam.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Status and Deactivation Section */}
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${user.status === "deactivated" ? "bg-red-500/10" : "bg-green-500/10"}`}>
                {user.status === "deactivated" ? (
                  <UserX className="h-5 w-5 text-red-400" />
                ) : (
                  <User className="h-5 w-5 text-green-400" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] form-label-fix">Account Status</h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Control user access to the system
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  user.status === "deactivated" ? "bg-red-500" : "bg-green-500"
                }`} />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {user.status === "deactivated" ? "Account Deactivated" : "Account Active"}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {user.status === "deactivated" 
                      ? "User cannot access the system" 
                      : "User has full access to the system"
                    }
                  </p>
                </div>
              </div>
              
              {(currentUser?.role === "manager" || currentUser?.role === "admin") && currentUser.uid !== user.uid && (
                <Button
                  onClick={handleDeactivateUser}
                  disabled={isDeactivating}
                  variant={user.status === "deactivated" ? "default" : "destructive"}
                  size="sm"
                  className={user.status === "deactivated" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {isDeactivating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {user.status === "deactivated" ? "Reactivating..." : "Deactivating..."}
                    </>
                  ) : (
                    <>
                      {user.status === "deactivated" ? (
                        <>
                          <User className="mr-2 h-4 w-4" />
                          Reactivate User
                        </>
                      ) : (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate User
                        </>
                      )}
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {user.status === "deactivated" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400">
                      <strong>Note:</strong> Deactivated users cannot log in or access any part of the system. 
                      They will be filtered out from all team lists and assignment rotations.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Duty Status Toggle (for closers, managers, admins) */}
          {showDutyToggle && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    {dutyStatus === "On Duty" ? (
                      <Eye className="h-5 w-5 text-green-400" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] form-label-fix">Duty Status</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Control availability in the closer lineup for {formData.role}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${
                      dutyStatus === "On Duty" ? "bg-green-500" : "bg-gray-500"
                    }`} />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {dutyStatus === "On Duty" ? "Currently Active" : "Currently Inactive"}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {dutyStatus === "On Duty" 
                          ? "Available to receive leads" 
                          : "Not receiving new leads"
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {loadingDutyStatus || updatingDutyStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-light)]" />
                    ) : (
                      <Switch
                        checked={dutyStatus === "On Duty"}
                        onCheckedChange={handleDutyToggle}
                        disabled={updatingDutyStatus}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-500"
                      />
                    )}
                  </div>
                </div>
                
                {formData.role !== user.role && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-400">
                      <strong>Note:</strong> Role change will affect duty status capabilities. Save changes to update closer record.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Profile Form */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 form-label-fix">
              <User className="h-4 w-4" />
              Profile Information
            </h4>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2 form-label-fix">
                  <User className="h-4 w-4" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleFormChange("displayName", e.target.value)}
                  placeholder="Enter display name"
                  disabled={user.status === "deactivated"}
                  className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)] form-input-fix disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 form-label-fix">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] cursor-not-allowed form-input-fix"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Email cannot be changed from this interface
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2 form-label-fix">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: UserRole) => handleFormChange("role", value)}
                  disabled={user.status === "deactivated"}
                >
                  <SelectTrigger 
                    id="role"
                    className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)] form-input-fix disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="modal-background-fix">
                    {getAvailableRoles().map((role) => (
                      <SelectItem 
                        key={role}
                        value={role}
                        className="text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-[var(--accent-light)]" />
                          {role}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team" className="flex items-center gap-2 form-label-fix">
                  <Users className="h-4 w-4" />
                  Team
                </Label>
                <Select 
                  value={formData.teamId} 
                  onValueChange={(value: string) => handleFormChange("teamId", value)}
                  disabled={currentUser?.role === "setter" || user.status === "deactivated"} // Setters cannot change teams
                >
                  <SelectTrigger 
                    id="team"
                    className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)] form-input-fix disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent className="modal-background-fix">
                    {teams.map((team) => (
                      <SelectItem 
                        key={team.id}
                        value={team.id}
                        className="text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--accent-light)]" />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentUser?.role === "setter" && (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    You are not allowed to change teams
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="sticky bottom-0 bg-[var(--background)]/95 backdrop-blur-lg border-t border-[var(--glass-border)] p-4 -mx-6 -mb-6">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || loadingTeams || user.status === "deactivated"}
              className="flex-1 bg-gradient-to-r from-[var(--accent-primary)] to-blue-600 text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
          
          {user.status === "deactivated" && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 text-center">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Profile editing is disabled for deactivated users. Reactivate the user to make changes.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateUserProfileModal;

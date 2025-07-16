"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot, collection, query, where } from "firebase/firestore";
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
  EyeOff
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

  // Load teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      setTeams(teamsData.filter(team => team.isActive));
      setLoadingTeams(false);
    });
    return () => unsubscribe();
  }, []);

  // Load duty status for closers, managers, and admins
  useEffect(() => {
    if (user.role === "closer" || user.role === "manager" || user.role === "admin") {
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
      await updateDoc(closerDocRef, {
        status: newStatus,
        updatedAt: new Date()
      });

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

      // If user is a closer and we're updating their role, update closer record too
      if (user.role === "closer" || user.role === "manager" || user.role === "admin") {
        const closerDocRef = doc(db, "closers", user.uid);
        await updateDoc(closerDocRef, {
          name: formData.displayName || formData.email,
          role: formData.role,
          teamId: formData.teamId,
          updatedAt: new Date()
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
  const showDutyToggle = user.role === "closer" || user.role === "manager" || user.role === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="space-y-6 py-4">
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
                    <h4 className="font-semibold text-[var(--text-primary)]">Duty Status</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Control availability in the closer lineup
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
              </div>
            </>
          )}

          <Separator />

          {/* Profile Form */}
          <div className="space-y-4">
            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Information
            </h4>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleFormChange("displayName", e.target.value)}
                  placeholder="Enter display name"
                  className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-white/5 border-[var(--glass-border)] text-[var(--text-secondary)] cursor-not-allowed"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  Email cannot be changed from this interface
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: UserRole) => handleFormChange("role", value)}
                >
                  <SelectTrigger 
                    id="role"
                    className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)]"
                  >
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRoles().map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamId" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Assignment
                </Label>
                <Select 
                  value={formData.teamId} 
                  onValueChange={(value: string) => handleFormChange("teamId", value)}
                  disabled={loadingTeams}
                >
                  <SelectTrigger 
                    id="teamId"
                    className="bg-white/10 border-[var(--glass-border)] text-[var(--text-primary)]"
                  >
                    <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>{team.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-[var(--glass-border)]">
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
            disabled={loading || loadingTeams}
            className="flex-1 bg-gradient-to-r from-[var(--accent-primary)] to-blue-600 text-white"
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
      </DialogContent>
    </Dialog>
  );
};

export default UpdateUserProfileModal;

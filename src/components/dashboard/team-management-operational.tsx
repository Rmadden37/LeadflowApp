"use client";

import type {AppUser} from "@/types";
import React, {useEffect, useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, onSnapshot, doc, updateDoc, where} from "firebase/firestore";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {SimpleAvatar} from "@/components/ui/simple-avatar";
import {Switch} from "@/components/ui/switch";
import {IOSToggle} from "@/components/ui/ios-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, 
  Users, 
  UserCog, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import ChangeUserRoleModal from "./change-user-role-modal";
import ConfirmUserDeleteModal from "./confirm-user-delete-modal";
import UpdateUserProfileModal from "./update-user-profile-modal";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface CloserStatus {
  uid: string;
  status: "On Duty" | "Off Duty";
}

interface TeamManagementOperationalProps {
  selectedTeam?: string;
}

export default function TeamManagementOperational({ selectedTeam = "all" }: TeamManagementOperationalProps) {
  const {user: managerUser} = useAuth();
  const {toast} = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [closerStatuses, setCloserStatuses] = useState<Record<string, CloserStatus>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<AppUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<AppUser | null>(null);
  const [settersExpanded, setSettersExpanded] = useState(false);
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());

  // Load teams
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

  // Load users based on manager permissions and selected team
  useEffect(() => {
    if (!managerUser) return;

    let usersQuery;
    if (managerUser.role === "admin") {
      // Admins can see all users or filter by selected team
      if (selectedTeam === "all") {
        usersQuery = query(collection(db, "users"));
      } else {
        usersQuery = query(
          collection(db, "users"),
          where("teamId", "==", selectedTeam)
        );
      }
    } else if (managerUser.role === "manager") {
      // Managers see only their team (ignore selectedTeam for managers)
      usersQuery = query(
        collection(db, "users"),
        where("teamId", "==", managerUser.teamId)
      );
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => ({uid: doc.id, ...doc.data()} as AppUser))
        .filter(user => user.status !== "pending_approval" && user.status !== "deactivated"); // Exclude pending and deactivated users

      setTeamUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [managerUser, selectedTeam]);

  // Load closer statuses from closers collection
  useEffect(() => {
    if (!managerUser) return;

    let closersQuery;
    if (managerUser.role === "admin") {
      // Admins can see all closers or filter by selected team
      if (selectedTeam === "all") {
        closersQuery = query(collection(db, "closers"));
      } else {
        closersQuery = query(
          collection(db, "closers"),
          where("teamId", "==", selectedTeam)
        );
      }
    } else if (managerUser.role === "manager") {
      // Managers see only their team closers
      closersQuery = query(
        collection(db, "closers"),
        where("teamId", "==", managerUser.teamId)
      );
    } else {
      return;
    }

    const unsubscribe = onSnapshot(closersQuery, (snapshot) => {
      const statuses: Record<string, CloserStatus> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        statuses[doc.id] = {
          uid: doc.id,
          status: data.status || "Off Duty"
        };
      });
      setCloserStatuses(statuses);
    });

    return () => unsubscribe();
  }, [managerUser, selectedTeam]);

  // Toggle closer lineup status
  const handleToggleCloserStatus = async (user: AppUser) => {
    if (!managerUser) return;
    
    // Check permissions: user can toggle themselves, or manager/admin can toggle anyone
    const canToggle = user.uid === managerUser.uid || 
                     managerUser.role === "manager" || 
                     managerUser.role === "admin";
    
    if (!canToggle) {
      toast({
        title: "Unauthorized",
        description: "You can only toggle your own lineup status.",
        variant: "destructive"
      });
      return;
    }

    const currentStatus = closerStatuses[user.uid]?.status || "Off Duty";
    const newStatus = currentStatus === "On Duty" ? "Off Duty" : "On Duty";
    
    setTogglingUsers(prev => new Set(prev).add(user.uid));

    try {
      const closerRef = doc(db, "closers", user.uid);
      await updateDoc(closerRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      toast({
        title: "Status Updated",
        description: `${user.displayName || user.email} is now ${newStatus.toLowerCase()} in the closer lineup.`,
      });
    } catch (error) {
      console.error("Error updating closer status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update lineup status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTogglingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.uid);
        return newSet;
      });
    }
  };

  // Separate users by role and status
  const closers = teamUsers.filter(user => 
    user.role === "closer" || user.role === "manager" || user.role === "admin"
  );
  
  const activeClosers = closers.filter(user => 
    closerStatuses[user.uid]?.status === "On Duty"
  );
  
  const inactiveClosers = closers.filter(user => 
    closerStatuses[user.uid]?.status !== "On Duty"
  );

  const setters = teamUsers.filter(user => user.role === "setter");

  // Helper function to get role styling
  const getRoleDetails = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          icon: ShieldCheck,
          bgColor: 'bg-purple-500/20',
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500/30'
        };
      case 'manager':
        return {
          icon: ShieldAlert,
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/30'
        };
      case 'closer':
        return {
          icon: UserCheck,
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/30'
        };
      default:
        return {
          icon: UserX,
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30'
        };
    }
  };

  // Render user card
  const renderUserCard = (user: AppUser, showToggle = false) => {
    const roleDetails = getRoleDetails(user.role);
    const RoleIcon = roleDetails.icon;
    const isCurrentUser = user.uid === managerUser?.uid;
    const closerStatus = closerStatuses[user.uid]?.status || "Off Duty";
    const isToggling = togglingUsers.has(user.uid);
    
    return (
      <div key={user.uid} className={`frosted-glass-card p-4 transition-all duration-200 hover:bg-white/[0.02] ${
        showToggle && closerStatus === "On Duty" ? 'ring-1 ring-green-500/20' : ''
      }`}>
        <div className="flex items-center gap-4">
          {/* Avatar with enhanced styling */}
          <div className="relative">
            <SimpleAvatar 
              className={`ring-2 transition-all duration-200 hover:ring-[var(--accent-primary)] cursor-pointer ${
                showToggle && closerStatus === "On Duty" 
                  ? 'ring-green-500/30 hover:ring-green-400' 
                  : 'ring-[var(--glass-border)]'
              }`}
              onClick={() => setSelectedUserForProfile(user)}
              user={user}
              size="md"
            />
            {/* Status indicator overlay for active closers */}
            {showToggle && closerStatus === "On Duty" && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--background)] animate-pulse shadow-sm shadow-green-400/50" />
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-[var(--text-primary)] truncate">
                {user.displayName || user.email || "Unnamed User"}
              </h4>
              {isCurrentUser && (
                <span className="px-2 py-0.5 text-xs rounded-md bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium">
                  You
                </span>
              )}
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mb-2 truncate">{user.email}</p>
            
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${roleDetails.bgColor} ${roleDetails.textColor} ${roleDetails.borderColor}`}>
                <RoleIcon className="mr-1 h-3 w-3" />
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>

          {/* iOS-Style Toggle Switch for Closers */}
          {showToggle && (
            <div className="flex items-center gap-3">
              {/* Status Label */}
              <div className="text-right">
                <div className={`text-xs font-semibold transition-colors duration-200 ${
                  closerStatus === "On Duty" 
                    ? "text-green-400" 
                    : "text-gray-400"
                }`}>
                  {closerStatus === "On Duty" ? "In Lineup" : "Off Duty"}
                </div>
              </div>
              
              {/* Custom iOS Toggle Switch */}
              <div className="relative">
                <IOSToggle
                  checked={closerStatus === "On Duty"}
                  onChange={() => handleToggleCloserStatus(user)}
                  disabled={isToggling}
                  className="focus:ring-green-500/30"
                />
                
                {/* Loading overlay */}
                {isToggling && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`
                  bg-white/10 border border-[var(--glass-border)] text-[var(--text-primary)] 
                  hover:bg-white/20 hover:border-[var(--accent-primary)]/30
                  transition-all duration-200 hover:scale-105 active:scale-95
                  shadow-sm hover:shadow-md
                `}
              >
                <UserCog className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[var(--background)]/95 backdrop-blur-lg border border-[var(--glass-border)] shadow-xl">
              <DropdownMenuItem 
                onClick={() => setSelectedUserForRoleChange(user)}
                className="text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors duration-150"
              >
                <UserCog className="mr-2 h-4 w-4" /> Change Role
              </DropdownMenuItem>
              {(managerUser?.role === "admin" || managerUser?.role === "manager") && user.uid !== managerUser.uid && (
                <DropdownMenuItem 
                  onClick={() => setSelectedUserForDelete(user)}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-light)]" />
          <p className="text-sm text-[var(--text-secondary)]">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Active Closers Section */}
        {activeClosers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Eye className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Active Closers ({activeClosers.length})
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Currently available in the closer lineup
                </p>
              </div>
            </div>
            
            <div className="grid gap-3">
              {activeClosers.map(user => renderUserCard(user, true))}
            </div>
          </div>
        )}

        {/* Inactive Closers Section */}
        {inactiveClosers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <EyeOff className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Inactive Closers ({inactiveClosers.length})
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Not currently available in the closer lineup
                </p>
              </div>
            </div>
            
            <div className="grid gap-3">
              {inactiveClosers.map(user => renderUserCard(user, true))}
            </div>
          </div>
        )}

        {/* Setters Section (Collapsible) */}
        {setters.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => setSettersExpanded(!settersExpanded)}
              className="flex items-center gap-3 w-full text-left group"
            >
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors">
                  Setters ({setters.length})
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Lead generation team members
                </p>
              </div>
              {settersExpanded ? (
                <ChevronUp className="h-5 w-5 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[var(--text-secondary)]" />
              )}
            </button>
            
            {settersExpanded && (
              <div className="grid gap-3">
                {setters.map(user => renderUserCard(user, false))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {teamUsers.length === 0 && (
          <div className="frosted-glass-card p-8 text-center">
            <Users className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No Team Members Found
            </h3>
            <p className="text-[var(--text-secondary)]">
              Start by inviting users to your team.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedUserForRoleChange && (
        <ChangeUserRoleModal
          userToEdit={selectedUserForRoleChange}
          isOpen={!!selectedUserForRoleChange}
          onClose={() => setSelectedUserForRoleChange(null)}
          managerTeamId={managerUser?.teamId || ""}
        />
      )}

      {selectedUserForDelete && (
        <ConfirmUserDeleteModal
          userToDelete={selectedUserForDelete}
          isOpen={!!selectedUserForDelete}
          onClose={() => setSelectedUserForDelete(null)}
          onConfirmDelete={async () => {
            // Implementation would go here
            setSelectedUserForDelete(null);
          }}
        />
      )}

      {selectedUserForProfile && (
        <UpdateUserProfileModal
          user={selectedUserForProfile}
          isOpen={!!selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </>
  );
}

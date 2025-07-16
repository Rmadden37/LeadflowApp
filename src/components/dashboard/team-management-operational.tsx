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

  // Render compact user card for grid layout
  const renderUserCard = (user: AppUser, showToggle = false) => {
    const roleDetails = getRoleDetails(user.role);
    const RoleIcon = roleDetails.icon;
    const isCurrentUser = user.uid === managerUser?.uid;
    const closerStatus = closerStatuses[user.uid]?.status || "Off Duty";
    const isToggling = togglingUsers.has(user.uid);
    
    return (
      <div key={user.uid} className={`frosted-glass-card p-3 transition-all duration-200 hover:bg-white/[0.02] min-h-[100px] ${
        showToggle && closerStatus === "On Duty" ? 'ring-1 ring-green-500/20' : ''
      }`}>
        <div className="flex flex-col gap-3 h-full">
          {/* Top Row: Larger Avatar + User Info */}
          <div className="flex items-start gap-3 flex-1">
            {/* Larger Avatar */}
            <div className="relative flex-shrink-0">
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
              {/* Status indicator for active closers */}
              {showToggle && closerStatus === "On Duty" && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--background)] animate-pulse" />
              )}
            </div>

            {/* User Info - Allow for wrapping */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start flex-col gap-1">
                <h4 className="font-semibold text-[var(--text-primary)] text-base break-words leading-tight">
                  {user.displayName || user.email?.split('@')[0] || "Unnamed"}
                </h4>
                {isCurrentUser && (
                  <span className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium">
                    You
                  </span>
                )}
              </div>
              
              {/* Role Assignment - Replaces Email */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${roleDetails.bgColor} ${roleDetails.textColor} ${roleDetails.borderColor}`}>
                  <RoleIcon className="mr-1 h-3 w-3" />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                
                {/* iOS Toggle for Closers - Inline */}
                {showToggle && (
                  <div className="flex items-center gap-2 ml-auto">
                    <div className={`text-xs font-medium transition-colors duration-200 ${
                      closerStatus === "On Duty" 
                        ? "text-green-400" 
                        : "text-gray-400"
                    }`}>
                      {closerStatus === "On Duty" ? "In Lineup" : "Off Duty"}
                    </div>
                    
                    <div className="relative">
                      <IOSToggle
                        checked={closerStatus === "On Duty"}
                        onChange={() => handleToggleCloserStatus(user)}
                        disabled={isToggling}
                        className="focus:ring-green-500/30 scale-90"
                      />
                      
                      {isToggling && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                          <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
      <div className="space-y-4">
        {/* Active Closers Section - Optimized Layout */}
        {activeClosers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Eye className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Closers ({activeClosers.length + inactiveClosers.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Toggle availability status
                </p>
              </div>
            </div>
            
            {/* Responsive Grid Layout for Better Space Usage */}
            <div className="grid gap-1.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {activeClosers.map(user => renderUserCard(user, true))}
              {inactiveClosers.map(user => renderUserCard(user, true))}
            </div>
          </div>
        )}

        {/* Show all closers if no active ones but there are inactive ones */}
        {activeClosers.length === 0 && inactiveClosers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gray-500/10">
                <Eye className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Closers ({inactiveClosers.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Toggle availability status
                </p>
              </div>
            </div>
            
            <div className="grid gap-1.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {inactiveClosers.map(user => renderUserCard(user, true))}
            </div>
          </div>
        )}

        {/* Setters Section (Collapsible) - Optimized */}
        {setters.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setSettersExpanded(!settersExpanded)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-light)] transition-colors">
                  Setters ({setters.length})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Lead generation team
                </p>
              </div>
              {settersExpanded ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              )}
            </button>
            
            {settersExpanded && (
              <div className="grid gap-1.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {setters.map(user => renderUserCard(user, false))}
              </div>
            )}
          </div>
        )}

        {/* Compact Empty State */}
        {teamUsers.length === 0 && (
          <div className="frosted-glass-card p-6 text-center">
            <Users className="h-8 w-8 text-[var(--text-secondary)] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              No Team Members Found
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
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

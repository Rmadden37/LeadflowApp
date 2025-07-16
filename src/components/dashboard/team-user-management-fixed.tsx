"use client";

import type {AppUser} from "@/types";
import React, {useEffect, useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, onSnapshot, doc, writeBatch, updateDoc} from "firebase/firestore";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  Loader2, 
  Users, 
  UserCog, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  Camera, 
  Search,
  UserCheck,
  UserX
} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import ChangeUserRoleModal from "./change-user-role-modal";
import ConfirmUserDeleteModal from "./confirm-user-delete-modal";
import UploadAvatarModal from "./upload-avatar-modal";
import UpdateUserProfileModal from "./update-user-profile-modal";
import TeamSelector from "./team-selector";
import InviteNewUserButton from "./invite-new-user-button";
import {initializeTeams} from "@/utils/init-teams";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function TeamUserManagement() {
  const {user: managerUser} = useAuth();
  const {toast} = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<AppUser | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);
  const [selectedUserForAvatar, setSelectedUserForAvatar] = useState<AppUser | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<AppUser | null>(null);

  // Load all teams and initialize missing ones
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData);
      
      // Always initialize teams to ensure "empire" exists
      if (managerUser?.role === "manager" || managerUser?.role === "admin") {
        // Check if Empire team exists
        const hasEmpireTeam = teamsData.some(team => team.id === "empire");
        
        if (!hasEmpireTeam) {
          initializeTeams().catch(() => {
            // Error handling done in initializeTeams
          });
        }
      }
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load teams.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast, managerUser]);

  useEffect(() => {
    if (managerUser?.role === "manager" || managerUser?.role === "admin") {
      setLoading(true);
      // Query all users across all teams
      const usersQuery = query(
        collection(db, "users")
      );
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({uid: doc.id, ...doc.data()} as AppUser));
        // Removed filter that excluded the manager

        // Sort client-side
        usersData.sort((a, b) => {
          const nameA = a.displayName || a.email || "";
          const nameB = b.displayName || b.email || "";
          return nameA.localeCompare(nameB);
        });

        setTeamUsers(usersData);
        setLoading(false);
      }, (_error) => {
        toast({title: "Error", description: "Could not fetch team users.", variant: "destructive"});
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
      setTeamUsers([]);
    }
    return undefined;
  }, [managerUser, toast]);

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
      toast({title: "Unauthorized", description: "Only managers and admins can delete users.", variant: "destructive"});
      return;
    }
    if (userToDelete.uid === managerUser.uid) {
      toast({title: "Action Not Allowed", description: "You cannot delete yourself.", variant: "destructive"});
      return;
    }

    const batch = writeBatch(db);
    const userDocRef = doc(db, "users", userToDelete.uid);
    batch.delete(userDocRef);

    // If the user was a closer, manager, or admin, delete their closer record too
    if (userToDelete.role === "closer" || userToDelete.role === "manager" || userToDelete.role === "admin") {
      const closerDocRef = doc(db, "closers", userToDelete.uid);
      batch.delete(closerDocRef);
    }

    try {
      await batch.commit();
      toast({
        title: "User Records Deleted",
        description: `${userToDelete.displayName || userToDelete.email}'s records have been removed from the application. Note: Full Firebase Authentication account deletion requires backend admin privileges.`,
        duration: 7000,
      });
      setSelectedUserForDelete(null); // Close modal
    } catch {
      toast({
        title: "Deletion Failed",
        description: "Could not delete user records. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChangeUserTeam = async (userToMove: AppUser, newTeamId: string) => {
    if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
      toast({title: "Unauthorized", description: "Only managers and admins can change user teams.", variant: "destructive"});
      return;
    }

    if (userToMove.teamId === newTeamId) {
      toast({title: "No Change", description: "User is already on that team.", variant: "default"});
      return;
    }

    try {
      const userDocRef = doc(db, "users", userToMove.uid);
      await updateDoc(userDocRef, {
        teamId: newTeamId,
        updatedAt: new Date()
      });

      // If the user is a closer, manager, or admin, also update their closer record
      if (userToMove.role === "closer" || userToMove.role === "manager" || userToMove.role === "admin") {
        const closerDocRef = doc(db, "closers", userToMove.uid);
        await updateDoc(closerDocRef, {
          teamId: newTeamId,
          updatedAt: new Date()
        });
      }

      const newTeam = teams.find(t => t.id === newTeamId);
      toast({
        title: "Team Changed",
        description: `${userToMove.displayName || userToMove.email} has been moved to ${newTeam?.name || newTeamId}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to change user's team. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-light)]" />
      </div>
    );
  }

  // Filter users based on search query and selected filters
  const filteredUsers = teamUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const teamName = (teams.find(t => t.id === user.teamId)?.name || '').toLowerCase();
    const matchesSearch =
      searchLower === '' ||
      displayName.includes(searchLower) ||
      email.includes(searchLower) ||
      role.includes(searchLower) ||
      teamName.includes(searchLower);
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesTeam = !teamFilter || user.teamId === teamFilter;
    return matchesSearch && matchesRole && matchesTeam;
  });

  // Helper function to get role icon and styling
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

  // Helper function to check online status (placeholder)
  const getOnlineStatus = (uid: string) => {
    // For now, return false - this would be implemented with real-time presence
    return false;
  };

  return (
    <>
      {/* Enhanced Team Selection and Invite Controls */}
      <div className="frosted-glass-card p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Building2 className="h-6 w-6 text-[var(--accent-light)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-base lg:text-lg font-semibold text-[var(--text-primary)]">Team Selection</h3>
              <p className="text-xs lg:text-sm text-[var(--text-secondary)]">Choose the team you want to manage</p>
            </div>
          </div>
          
          {/* Enhanced Invite Button */}
          <InviteNewUserButton 
            variant="primary-solid"
            className="bg-gradient-to-r from-[var(--accent-primary)] to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 rounded-lg px-4 lg:px-6 py-2 lg:py-2.5 text-sm flex items-center gap-2 w-full lg:w-auto justify-center"
          />
        </div>
        
        <div className="mt-4">
          <TeamSelector />
        </div>
      </div>

      {/* Enhanced Team Member Management */}
      <div className="frosted-glass-card">
        <div className="p-4 lg:p-6 border-b border-[var(--glass-border)]">
          <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex items-center">
              <Users className="mr-3 h-6 lg:h-7 w-6 lg:w-7 text-[var(--accent-light)]" />
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-[var(--text-primary)]">Team Members</h2>
                <p className="text-[var(--text-secondary)] text-sm lg:text-base">Manage roles, teams, and access for your team members</p>
              </div>
            </div>
            
            {/* Enhanced Search and Filter Controls */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 w-full lg:w-auto">
              {/* Search Filter */}
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  className="w-full pl-9 bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search team members"
                />
              </div>
              
              {/* Enhanced Filter Dropdowns */}
              <div className="flex gap-2 w-full lg:w-auto">
                <select
                  className="flex-1 lg:flex-none border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm bg-white/10 backdrop-blur-md text-[var(--text-primary)] hover:bg-white/20 focus:bg-white/20 focus:border-[var(--accent-primary)] transition-all duration-200 min-w-0 lg:min-w-[120px]"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>All Roles</option>
                  <option value="admin" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>Admin</option>
                  <option value="manager" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>Manager</option>
                  <option value="closer" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>Closer</option>
                  <option value="user" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>User</option>
                </select>
                
                <select
                  className="flex-1 lg:flex-none border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm bg-white/10 backdrop-blur-md text-[var(--text-primary)] hover:bg-white/20 focus:bg-white/20 focus:border-[var(--accent-primary)] transition-all duration-200 min-w-0 lg:min-w-[120px]"
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value)}
                  aria-label="Filter by team"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id} style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 lg:p-6 space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
              <p className="text-[var(--text-secondary)] text-lg font-medium">
                {searchQuery.trim() !== '' ? "No matching team members found" : "No team members found"}
              </p>
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                {searchQuery.trim() !== '' ? "Try adjusting your search or filters" : "Start by inviting team members"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((teamMember) => {
                const roleDetails = getRoleDetails(teamMember.role);
                const RoleIcon = roleDetails.icon;
                const isCurrentUser = teamMember.uid === managerUser?.uid;
                const isOnline = getOnlineStatus(teamMember.uid);
                
                return (
                  <div
                    key={teamMember.uid}
                    className={`p-4 lg:p-5 rounded-xl border border-[var(--glass-border)] bg-white/5 hover:bg-white/10 transition-all duration-200 ${
                      isCurrentUser ? 'ring-2 ring-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* User Info Section */}
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="relative group">
                          <Avatar 
                            className={`h-12 w-12 lg:h-14 lg:w-14 border-2 cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[var(--accent-primary)] hover:ring-offset-2 ${
                              isCurrentUser ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 border-[var(--accent-primary)]' : 'border-[var(--glass-border)]'
                            }`}
                            onClick={() => setSelectedUserForAvatar(teamMember)}
                            tabIndex={0}
                            aria-label={`Edit avatar for ${teamMember.displayName || teamMember.email}`}
                          >
                            <AvatarImage src={teamMember.avatarUrl || undefined} alt={teamMember.displayName || teamMember.email || "User"} />
                            <AvatarFallback className="text-base font-bold">
                              {teamMember.displayName ? teamMember.displayName.substring(0, 2).toUpperCase() : (teamMember.email ? teamMember.email.substring(0, 2).toUpperCase() : "??")}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Online Status Indicator */}
                          <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'} transition-colors duration-200`} />
                          
                          {/* Camera overlay on hover */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                               onClick={() => setSelectedUserForAvatar(teamMember)}>
                            <Camera className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-base lg:text-lg text-[var(--text-primary)] break-words">
                              {teamMember.displayName || teamMember.email || "Unnamed User"}
                            </p>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 text-xs rounded-md bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium whitespace-nowrap">
                                You
                              </span>
                            )}
                            {isOnline && (
                              <span className="px-2 py-0.5 text-xs rounded-md bg-green-500/20 text-green-400 font-medium whitespace-nowrap">
                                Online
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-2 break-all">{teamMember.email}</p>
                          
                          {/* Enhanced Role and Team Badges */}
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${roleDetails.bgColor} ${roleDetails.textColor} ${roleDetails.borderColor}`}>
                              <RoleIcon className="mr-1.5 h-3.5 w-3.5" />
                              {teamMember.role.charAt(0).toUpperCase() + teamMember.role.slice(1)}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[var(--text-secondary)]/20 text-[var(--text-secondary)] border border-[var(--text-secondary)]/30">
                              <Building2 className="mr-1.5 h-3.5 w-3.5" />
                              {teams.find(t => t.id === teamMember.teamId)?.name || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Action Buttons - Direct Profile Management */}
                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedUserForProfile(teamMember)}
                          className="bg-white/10 border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/20 hover:border-[var(--accent-primary)]/50 focus:bg-white/20 focus:border-[var(--accent-primary)] transition-all duration-200 flex-1 lg:flex-none backdrop-blur-sm" 
                          aria-label={`Manage profile for ${teamMember.displayName || teamMember.email}`}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          <span className="hidden lg:inline">Edit Profile</span>
                          <span className="lg:hidden">Edit</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
          onConfirmDelete={() => handleDeleteUser(selectedUserForDelete)}
        />
      )}

      {selectedUserForAvatar && (
        <UploadAvatarModal
          user={selectedUserForAvatar}
          isOpen={!!selectedUserForAvatar}
          onClose={() => setSelectedUserForAvatar(null)}
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

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserCog, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppUser } from "@/types";
import UpdateUserProfileModal from "./update-user-profile-modal";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function TeamMembersDropdown() {
  const { user: managerUser } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<AppUser | null>(null);

  // Load teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      setTeams(teamsData.filter(team => team.isActive));
    });
    return () => unsubscribe();
  }, []);

  // Load team members based on manager's team
  useEffect(() => {
    if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Managers see only their team members
    const usersQuery = query(
      collection(db, "users"),
      where("teamId", "==", managerUser.teamId)
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() } as AppUser))
        .filter(user => 
          user.status !== "pending_approval" && 
          user.uid !== managerUser.uid // Exclude the manager themselves
        );

      // Sort by name
      usersData.sort((a, b) => {
        const nameA = a.displayName || a.email || "";
        const nameB = b.displayName || b.email || "";
        return nameA.localeCompare(nameB);
      });

      setTeamMembers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading team members:", error);
      toast({
        title: "Error",
        description: "Could not fetch team members.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [managerUser, toast]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleUpdateProfile = () => {
    if (!selectedUserId) {
      toast({
        title: "No User Selected",
        description: "Please select a team member first.",
        variant: "destructive"
      });
      return;
    }

    const selectedUser = teamMembers.find(user => user.uid === selectedUserId);
    if (selectedUser) {
      setSelectedUserForProfile(selectedUser);
    }
  };

  const getCurrentTeam = () => {
    return teams.find(team => team.id === managerUser?.teamId);
  };

  const selectedUser = teamMembers.find(user => user.uid === selectedUserId);
  const currentTeam = getCurrentTeam();

  if (!managerUser || (managerUser.role !== "manager" && managerUser.role !== "admin")) {
    return (
      <div className="frosted-glass-card p-6">
        <div className="text-center">
          <Users className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Access Restricted
          </h3>
          <p className="text-[var(--text-secondary)]">
            Only managers and admins can access team member management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="frosted-glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-light)]" />
            <p className="text-sm text-[var(--text-secondary)]">Loading team members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="frosted-glass-card p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Users className="h-6 w-6 text-[var(--accent-light)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Team Members
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {currentTeam ? `${currentTeam.name} Team` : "Select a team member to update their profile"}
              </p>
            </div>
          </div>

          {/* Team Member Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Select Team Member
              </label>
              <Select value={selectedUserId} onValueChange={handleSelectUser}>
                <SelectTrigger className="w-full bg-white/10 border border-[var(--glass-border)] backdrop-blur-md text-[var(--text-primary)] hover:bg-white/20 focus:bg-white/20 focus:border-[var(--accent-primary)] transition-all duration-200">
                  <SelectValue placeholder="Choose a team member...">
                    {selectedUser && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedUser.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {selectedUser.displayName 
                              ? selectedUser.displayName.substring(0, 2).toUpperCase() 
                              : selectedUser.email?.substring(0, 2).toUpperCase() || "??"
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">
                            {selectedUser.displayName || selectedUser.email}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] capitalize">
                            {selectedUser.role}
                          </span>
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[var(--background)]/95 backdrop-blur-lg border border-[var(--glass-border)] shadow-2xl">
                  {teamMembers.length === 0 ? (
                    <div className="p-3 text-center text-[var(--text-secondary)]">
                      No team members found
                    </div>
                  ) : (
                    teamMembers.map((member) => (
                      <SelectItem 
                        key={member.uid} 
                        value={member.uid}
                        className="text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 focus:bg-[var(--accent-primary)]/10 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.displayName 
                                ? member.displayName.substring(0, 2).toUpperCase() 
                                : member.email?.substring(0, 2).toUpperCase() || "??"
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">
                              {member.displayName || member.email}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-secondary)] capitalize">
                                {member.role}
                              </span>
                              {member.email && (
                                <span className="text-xs text-[var(--text-secondary)]">
                                  • {member.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Selected User Preview */}
            {selectedUser && (
              <div className="p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-[var(--glass-border)]">
                      <AvatarImage src={selectedUser.avatarUrl || undefined} />
                      <AvatarFallback>
                        {selectedUser.displayName 
                          ? selectedUser.displayName.substring(0, 2).toUpperCase() 
                          : selectedUser.email?.substring(0, 2).toUpperCase() || "??"
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">
                        {selectedUser.displayName || selectedUser.email}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {selectedUser.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                          {selectedUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
              </div>
            )}

            {/* Update Profile Button */}
            <Button
              onClick={handleUpdateProfile}
              disabled={!selectedUserId}
              className="w-full bg-gradient-to-r from-[var(--accent-primary)] to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Edit User Profile
            </Button>
          </div>

          {/* Team Info */}
          {currentTeam && (
            <div className="text-xs text-[var(--text-secondary)] p-3 bg-white/5 rounded-lg border border-[var(--glass-border)]">
              <div className="flex items-center justify-between">
                <span>
                  <strong className="text-[var(--text-primary)]">Team:</strong> {currentTeam.name}
                </span>
                <span>
                  <strong className="text-[var(--text-primary)]">Members:</strong> {teamMembers.length}
                </span>
              </div>
              {currentTeam.description && (
                <p className="mt-1 text-[var(--text-tertiary)]">
                  {currentTeam.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Update User Profile Modal */}
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

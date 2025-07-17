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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="text-center py-12 px-8">
          <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            Only managers and admins can access team member management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
            <p className="text-sm text-gray-600">Loading team members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* iOS Settings Style Header */}
        <div className="flex items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-gray-900 text-lg font-semibold">
              Team Members
            </div>
            <div className="text-gray-500 text-sm">
              {currentTeam ? `${currentTeam.name} Team • ${teamMembers.length} members` : "Select a team member to update their profile"}
            </div>
          </div>
        </div>

        {/* iOS Settings Style Team Member Selection */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
            Member Selection
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center p-4 border-b border-gray-100">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <UserCog className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-gray-900 font-medium">Choose Team Member</div>
                <div className="text-gray-500 text-sm">
                  Select a member to update their profile
                </div>
              </div>
            </div>
            
            {/* Enhanced Member Selector */}
            <div className="p-4 bg-gray-50">
              <Select value={selectedUserId} onValueChange={handleSelectUser}>
                <SelectTrigger className="w-full bg-white border border-gray-300 hover:border-blue-500 focus:border-blue-500 transition-all duration-200 h-12 rounded-xl text-gray-900">
                  <SelectValue placeholder="Choose a team member...">
                    {selectedUser && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 ring-2 ring-gray-200">
                          <AvatarImage src={selectedUser.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                            {selectedUser.displayName 
                              ? selectedUser.displayName.substring(0, 2).toUpperCase() 
                              : selectedUser.email?.substring(0, 2).toUpperCase() || "??"
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div className="font-medium text-gray-900">
                            {selectedUser.displayName || selectedUser.email}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {selectedUser.role}
                          </div>
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white backdrop-blur-xl border border-gray-200 shadow-xl rounded-xl">
                  {teamMembers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No team members found
                    </div>
                  ) : (
                    teamMembers.map((member) => (
                      <SelectItem 
                        key={member.uid} 
                        value={member.uid}
                        className="text-gray-900 hover:bg-blue-50 focus:bg-blue-50 cursor-pointer rounded-lg m-1 p-3"
                      >
                        <div className="flex items-center gap-3 py-1">
                          <Avatar className="h-8 w-8 ring-2 ring-gray-200">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                              {member.displayName 
                                ? member.displayName.substring(0, 2).toUpperCase() 
                                : member.email?.substring(0, 2).toUpperCase() || "??"
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-gray-900">
                              {member.displayName || member.email}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 capitalize">
                                {member.role}
                              </span>
                              {member.email && (
                                <span className="text-xs text-gray-400">
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
          </div>
        </div>

        {/* Selected User Preview Card */}
        {selectedUser && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Selected Member
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center p-4">
                <Avatar className="h-12 w-12 ring-2 ring-blue-200 mr-4">
                  <AvatarImage src={selectedUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                    {selectedUser.displayName 
                      ? selectedUser.displayName.substring(0, 2).toUpperCase() 
                      : selectedUser.email?.substring(0, 2).toUpperCase() || "??"
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-gray-900 font-semibold">
                    {selectedUser.displayName || selectedUser.email}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {selectedUser.email}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 capitalize">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iOS Settings Style Action Button */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4">
              <Button
                onClick={handleUpdateProfile}
                disabled={!selectedUserId}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-0"
              >
                <UserCog className="mr-3 h-5 w-5" />
                Edit User Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Team Information Card */}
        {currentTeam && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Team Information
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center p-4">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 font-medium">{currentTeam.name}</div>
                  <div className="text-gray-500 text-sm">
                    {teamMembers.length} active members
                  </div>
                </div>
              </div>
              {currentTeam.description && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                    {currentTeam.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
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

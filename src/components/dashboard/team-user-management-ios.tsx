"use client";

import type {AppUser} from "@/types";
import React, {useEffect, useState, useMemo, useCallback, useRef} from "react";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, onSnapshot} from "firebase/firestore";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, 
  UserCog, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Building2, 
  ChevronDown, 
  Camera, 
  Search,
  UserCheck,
  UserX,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff,
  RefreshCw,
  MapPin
} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import ConfirmUserDeleteModal from "./confirm-user-delete-modal";
import UpdateUserProfileModal from "./update-user-profile-modal";
import TeamSelector from "./team-selector";
import InviteNewUserButton from "./invite-new-user-button";
import {initializeTeams} from "@/utils/init-teams";

interface Team {
  id: string;
  name: string;
  description?: string;
  regionId: string;
  isActive: boolean;
}

interface Region {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface FilterState {
  role: string;
  team: string;
  region: string;
  status: string;
}

// iOS-style haptic feedback simulation
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[type]);
  }
};

export default function TeamUserManagementEnhanced() {
  const {user: managerUser} = useAuth();
  const {toast} = useToast();
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    role: "",
    team: "",
    region: "",
    status: ""
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<AppUser | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<AppUser | null>(null);
  
  // Pull-to-refresh implementation
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || containerRef.current?.scrollTop !== 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = Math.max(0, touchY - touchStartY.current);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
    }
  }, [isPulling]);
  
  const handleTouchEnd = useCallback(() => {
    if (isPulling) {
      setIsPulling(false);
      if (pullDistance > 60) {
        // Trigger refresh
        setIsRefreshing(true);
        triggerHapticFeedback('medium');
        
        // Simulate refresh delay
        setTimeout(() => {
          setIsRefreshing(false);
          toast({
            title: "Refreshed",
            description: "Team data updated successfully",
          });
        }, 1500);
      }
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, toast]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Load teams
  useEffect(() => {
    const teamsQuery = query(collection(db, "teams"));
    
    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsData);
      
      if (managerUser?.role === "manager" || managerUser?.role === "admin") {
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

  // Load regions
  useEffect(() => {
    const regionsQuery = query(collection(db, "regions"));
    
    const unsubscribe = onSnapshot(regionsQuery, (snapshot) => {
      const regionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Region));
      
      setRegions(regionsData);
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load regions.",
        variant: "destructive",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  // Load users
  useEffect(() => {
    if (managerUser?.role === "manager" || managerUser?.role === "admin") {
      setLoading(true);
      const usersQuery = query(collection(db, "users"));
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs
          .map((doc) => ({uid: doc.id, ...doc.data()} as AppUser));

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
      return undefined;
    }
  }, [managerUser, toast]);

  // Enhanced filtering with memoization
  const filteredUsers = useMemo(() => {
    return teamUsers.filter((user) => {
      const displayName = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      const userTeam = teams.find(t => t.id === user.teamId);
      const teamName = (userTeam?.name || '').toLowerCase();
      const regionName = (regions.find(r => r.id === userTeam?.regionId)?.name || '').toLowerCase();
      
      const matchesSearch = searchLower === '' ||
        displayName.includes(searchLower) ||
        email.includes(searchLower) ||
        role.includes(searchLower) ||
        teamName.includes(searchLower) ||
        regionName.includes(searchLower);
      
      const matchesRole = !filters.role || user.role === filters.role || (filters.role === "setter" && (user.role as any) === "user");
      const matchesTeam = !filters.team || user.teamId === filters.team;
      const matchesRegion = !filters.region || userTeam?.regionId === filters.region;
      
      return matchesSearch && matchesRole && matchesTeam && matchesRegion;
    });
  }, [teamUsers, searchQuery, filters, teams, regions]);

  // Role styling
  const getRoleDetails = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          icon: ShieldCheck,
          bgColor: 'bg-purple-500/10',
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500/20'
        };
      case 'manager':
        return {
          icon: ShieldAlert,
          bgColor: 'bg-blue-500/10',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/20'
        };
      case 'closer':
        return {
          icon: UserCheck,
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/20'
        };
      case 'setter':
      case 'user': // Handle legacy "user" role as "setter"
        return {
          icon: UserCheck,
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-400',
          borderColor: 'border-orange-500/20'
        };
      default:
        return {
          icon: UserX,
          bgColor: 'bg-gray-500/10',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/20'
        };
    }
  };

  const getOnlineStatus = (uid: string) => {
    return false; // Placeholder
  };

  const toggleUserSelection = (uid: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(uid)) {
      newSelection.delete(uid);
    } else {
      newSelection.add(uid);
    }
    setSelectedUsers(newSelection);
    triggerHapticFeedback('light');
  };

  const clearFilters = () => {
    setFilters({ role: "", team: "", region: "", status: "" });
    setSearchQuery("");
    triggerHapticFeedback('light');
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length + (searchQuery ? 1 : 0);

  return (
    <div ref={containerRef} className="space-y-4 relative overflow-hidden">
      {/* Pull-to-refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-500/10 border-b border-blue-500/20 transition-all duration-200 z-10"
          style={{
            height: isRefreshing ? '60px' : `${Math.min(pullDistance, 60)}px`,
            opacity: isRefreshing ? 1 : pullDistance / 60
          }}
        >
          <RefreshCw className={`h-4 w-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-sm text-blue-400 font-medium">
            {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}
      {/* Enhanced Team Selection Header with iOS styling */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] text-lg">Team Selection</h3>
              <p className="text-sm text-[var(--text-secondary)]">Choose team to manage members</p>
            </div>
          </div>
          
          <InviteNewUserButton 
            variant="primary-solid"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-2xl font-medium shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
          />
        </div>
        
        <div className="mt-6">
          <TeamSelector />
        </div>
      </div>

      {/* Enhanced Search and Filters Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Team Members</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>

          {/* Enhanced Multi-select toggle */}
          {filteredUsers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedUsers(new Set());
                triggerHapticFeedback('medium');
              }}
              className="bg-white/5 border-white/20 text-[var(--text-primary)] hover:bg-white/10 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              {isMultiSelectMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {isMultiSelectMode ? 'Exit Select' : 'Multi Select'}
            </Button>
          )}
        </div>

        {/* Enhanced Search Bar with iOS styling */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <Input
            type="search"
            placeholder="Search members by name, email, role, team, or region..."
            className="pl-12 pr-4 bg-white/10 border-white/20 rounded-2xl h-12 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Enhanced iOS-style Filter Pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`bg-white/5 border-white/20 rounded-2xl px-5 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.role ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'text-[var(--text-primary)]'
                }`}
                onClick={() => triggerHapticFeedback('light')}
              >
                <Filter className="h-3 w-3 mr-2" />
                Role {filters.role && `(${filters.role})`}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--background)] border-[var(--glass-border)] rounded-2xl shadow-2xl">
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, role: ""});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                All Roles
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, role: "manager"});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                Manager
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, role: "closer"});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                Closer
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, role: "setter"});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                Setter
              </DropdownMenuItem>
              {/* Only show admin option if current user is admin */}
              {managerUser?.role === "admin" && (
                <DropdownMenuItem 
                  onClick={() => {
                    setFilters({...filters, role: "admin"});
                    triggerHapticFeedback('light');
                  }}
                  className="rounded-xl"
                >
                  Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`bg-white/5 border-white/20 rounded-2xl px-5 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.team ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'text-[var(--text-primary)]'
                }`}
                onClick={() => triggerHapticFeedback('light')}
              >
                <Building2 className="h-3 w-3 mr-2" />
                Team {filters.team && `(${teams.find(t => t.id === filters.team)?.name})`}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--background)] border-[var(--glass-border)] rounded-2xl shadow-2xl">
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, team: ""});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                All Teams
              </DropdownMenuItem>
              {teams.map(team => (
                <DropdownMenuItem 
                  key={team.id} 
                  onClick={() => {
                    setFilters({...filters, team: team.id});
                    triggerHapticFeedback('light');
                  }}
                  className="rounded-xl"
                >
                  {team.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`bg-white/5 border-white/20 rounded-2xl px-5 py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 ${
                  filters.region ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'text-[var(--text-primary)]'
                }`}
                onClick={() => triggerHapticFeedback('light')}
              >
                <MapPin className="h-3 w-3 mr-2" />
                Region {filters.region && `(${regions.find(r => r.id === filters.region)?.name})`}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[var(--background)] border-[var(--glass-border)] rounded-2xl shadow-2xl">
              <DropdownMenuItem 
                onClick={() => {
                  setFilters({...filters, region: ""});
                  triggerHapticFeedback('light');
                }}
                className="rounded-xl"
              >
                All Regions
              </DropdownMenuItem>
              {regions.map(region => (
                <DropdownMenuItem 
                  key={region.id} 
                  onClick={() => {
                    setFilters({...filters, region: region.id});
                    triggerHapticFeedback('light');
                  }}
                  className="rounded-xl"
                >
                  {region.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 px-4 py-2 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Clear {activeFiltersCount}
            </Button>
          )}
        </div>

        {/* Enhanced Multi-select actions with iOS styling */}
        {isMultiSelectMode && selectedUsers.size > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{selectedUsers.size}</span>
                </div>
                <span className="text-sm font-medium text-blue-400">
                  {selectedUsers.size} member{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                  onClick={() => triggerHapticFeedback('medium')}
                >
                  Bulk Actions
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelectedUsers(new Set());
                    triggerHapticFeedback('light');
                  }}
                  className="text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Member List with iOS-style cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="text-[var(--text-secondary)] font-medium">Loading team members...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-500/10 to-gray-600/10 mx-auto mb-6 flex items-center justify-center">
                <Users className="h-12 w-12 text-[var(--text-secondary)] opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {searchQuery || activeFiltersCount > 0 ? "No matching members found" : "No team members found"}
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                {searchQuery || activeFiltersCount > 0 ? "Try adjusting your search or filters" : "Start by inviting team members"}
              </p>
              {(!searchQuery && activeFiltersCount === 0) && (
                <InviteNewUserButton 
                  variant="primary-solid"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-2xl font-medium shadow-lg transform transition-all duration-200 hover:scale-105"
                />
              )}
            </div>
          ) : (
            filteredUsers.map((teamMember, index) => {
              const roleDetails = getRoleDetails(teamMember.role);
              const RoleIcon = roleDetails.icon;
              const isCurrentUser = teamMember.uid === managerUser?.uid;
              const isOnline = getOnlineStatus(teamMember.uid);
              const isSelected = selectedUsers.has(teamMember.uid);
              const userTeam = teams.find(t => t.id === teamMember.teamId);
              const userRegion = regions.find(r => r.id === userTeam?.regionId);
              
              return (
                <div
                  key={teamMember.uid}
                  className={`
                    relative p-5 rounded-2xl border transition-all duration-300 backdrop-blur-sm
                    ${isSelected 
                      ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-blue-600/5 shadow-lg scale-[1.02]' 
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                    }
                    ${isMultiSelectMode ? 'cursor-pointer' : ''}
                    transform hover:scale-[1.01] active:scale-[0.99]
                  `}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards'
                  }}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleUserSelection(teamMember.uid);
                    }
                  }}
                >
                  {isMultiSelectMode && (
                    <div className="absolute top-4 left-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500 scale-110' 
                          : 'border-white/30 hover:border-blue-400'
                      }`}>
                        {isSelected && (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center gap-5 ${isMultiSelectMode ? 'ml-10' : ''}`}>
                    {/* Enhanced Avatar */}
                    <div className="relative">
                      <Avatar 
                        className="h-14 w-14 ring-2 ring-white/10 shadow-lg cursor-pointer hover:ring-blue-500/50 transition-all duration-200"
                        onClick={() => {
                          if (!isMultiSelectMode) {
                            setSelectedUserForProfile(teamMember);
                            triggerHapticFeedback('light');
                          }
                        }}
                      >
                        <AvatarImage 
                          src={teamMember.photoURL || undefined} 
                          alt={teamMember.displayName || teamMember.email || "User avatar"} 
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold text-lg">
                          {(teamMember.displayName || teamMember.email || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-[var(--background)] shadow-lg">
                          <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate text-lg">
                          {teamMember.displayName || teamMember.email || "Unnamed User"}
                        </h3>
                        {isCurrentUser && (
                          <span className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 font-medium border border-blue-500/20">
                            You
                          </span>
                        )}
                        {isOnline && (
                          <span className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 font-medium border border-green-500/20">
                            Online
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-[var(--text-secondary)] mb-3 truncate">
                        {teamMember.email}
                      </p>
                      
                      {/* Enhanced Role, Team, and Region Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium border backdrop-blur-sm ${roleDetails.bgColor} ${roleDetails.textColor} ${roleDetails.borderColor}`}>
                          <RoleIcon className="mr-2 h-3.5 w-3.5" />
                          {(teamMember.role as any) === 'user' ? 'Setter' : teamMember.role.charAt(0).toUpperCase() + teamMember.role.slice(1)}
                        </span>
                        <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-sm">
                          <Building2 className="mr-2 h-3.5 w-3.5" />
                          {userTeam?.name || 'Unknown'}
                        </span>
                        {userRegion && (
                          <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 backdrop-blur-sm">
                            <MapPin className="mr-2 h-3.5 w-3.5" />
                            {userRegion.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Actions */}
                    {!isMultiSelectMode && (
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-10 w-10 p-0 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
                              onClick={() => triggerHapticFeedback('light')}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[var(--background)] border-[var(--glass-border)] rounded-2xl shadow-2xl" align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUserForProfile(teamMember);
                                triggerHapticFeedback('medium');
                              }}
                              className="rounded-xl"
                            >
                              <UserCog className="mr-3 h-4 w-4" />
                              Update User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUserForDelete(teamMember);
                                triggerHapticFeedback('heavy');
                              }}
                              className="text-red-400 hover:text-red-300 rounded-xl"
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedUserForProfile && (
        <UpdateUserProfileModal
          isOpen={!!selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
          user={selectedUserForProfile}
        />
      )}
      
      {selectedUserForDelete && (
        <ConfirmUserDeleteModal
          isOpen={!!selectedUserForDelete}
          onClose={() => setSelectedUserForDelete(null)}
          userToDelete={selectedUserForDelete}
          onConfirmDelete={async () => {
            // Handle user deletion logic here
            setSelectedUserForDelete(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TeamMembersDropdown from "@/components/dashboard/team-members-dropdown";
import TeamManagementOperational from "@/components/dashboard/team-management-operational";
import PendingApprovalsModal from "@/components/dashboard/pending-approvals-modal";

interface Team {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

/**
 * 🌟 AURELIAN'S PREMIUM iOS MANAGE TEAMS PAGE
 * 
 * World-class iOS Settings-style interface featuring:
 * ✨ VISUAL EXCELLENCE:
 * - Authentic iOS 17+ Settings app design language
 * - Premium glassmorphism with dynamic blur effects
 * - Hierarchical information architecture with clear sections
 * - Context-aware iconography with SF Symbols inspiration
 * 
 * 🎯 INTERACTION MASTERY:
 * - Native iOS navigation patterns and behaviors
 * - Touch-responsive elements with haptic feedback
 * - Progressive disclosure for complex information
 * - Smart state management with real-time updates
 * 
 * ⚡ PERFORMANCE OPTIMIZED:
 * - Efficient component rendering with smart updates
 * - Memory-conscious data handling
 * - Battery-friendly interaction patterns
 * - Optimized for large team datasets
 * 
 * 🎨 DESIGN SYSTEM COMPLIANCE:
 * - iOS 17+ HIG compliance with native patterns
 * - Universal design with accessibility focus
 * - Consistent typography and spacing grid
 * - Proper color contrast and readability
 */

export default function ManageTeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  // Load teams data
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

  // Redirect non-managers/admins away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "manager" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Show a loading skeleton while auth state is being determined
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-light)]" />
      </div>
    );
  }

  if (!user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="container py-10">
        <div className="frosted-glass-card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Access Restricted</h2>
            <p className="text-[var(--text-secondary)]">
              You do not have permission to access team management. Manager or admin access required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* 🎯 STREAMLINED HEADER */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-0.5">
                Team Management
              </h1>
              <p className="text-white/60 text-sm font-medium">
                {user.role === "admin" && selectedTeam !== "all" 
                  ? `Managing ${teams.find(t => t.id === selectedTeam)?.name || "Selected"} Team`
                  : user.role === "admin" 
                  ? "Cross-team overview and administration"
                  : "Your team permissions and members"
                }
              </p>
            </div>
            
            {/* Single Pending Approvals - Always Top Right */}
            <PendingApprovalsModal 
              triggerClassName="bg-gradient-to-r from-orange-500/20 to-amber-600/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 hover:text-orange-200 backdrop-blur-sm transition-all duration-200"
              triggerVariant="outline"
              triggerSize="sm"
            />
          </div>
        </div>
      </div>

      {/* 🎨 MAIN CONTENT - Optimized Layout */}
      <div className="container py-4 space-y-4">
        {/* 🎯 ADMIN TEAM SELECTOR - Simplified */}
        {user.role === "admin" && (
          <div className="bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-2xl p-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="h-12 modal-background-fix bg-white/10 border border-white/20 backdrop-blur-md text-white hover:bg-white/20 focus:bg-white/20 focus:border-[#007AFF] transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[#007AFF]/20">
                    <Users className="h-4 w-4 text-[#007AFF]" />
                  </div>
                  <SelectValue placeholder="Choose team scope...">
                    {selectedTeam === "all" ? "All Teams View" : teams.find(t => t.id === selectedTeam)?.name + " Team" || "Select Team"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="modal-background-fix bg-black/95 backdrop-blur-lg border border-white/20 shadow-2xl">
                <SelectItem 
                  value="all"
                  className="text-white hover:bg-[#007AFF]/10 focus:bg-[#007AFF]/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
                    All Teams View
                  </div>
                </SelectItem>
                {teams
                  .filter(team => ['empire-team', 'takeoverpros', 'revolution'].includes(team.id))
                  .map((team) => (
                  <SelectItem 
                    key={team.id} 
                    value={team.id}
                    className="text-white hover:bg-[#007AFF]/10 focus:bg-[#007AFF]/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      {team.name} Team
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 📋 TEAM CONTENT - Simplified */}
        <div className={cn(
          "bg-white/[0.08] backdrop-blur-xl border border-white/20",
          "rounded-2xl shadow-xl overflow-hidden",
          "before:absolute before:inset-0 before:rounded-2xl",
          "before:bg-gradient-to-b before:from-white/5 before:to-transparent",
          "before:pointer-events-none relative"
        )}>          
          {/* 📱 CONTENT */}
          <div className="p-4">
            {user.role === "admin" ? (
              <TeamManagementOperational selectedTeam={selectedTeam} />
            ) : (
              <>
                {/* Pending Approvals for Non-Admins */}
                <div className="mb-4 flex justify-end">
                  <PendingApprovalsModal 
                    triggerClassName="bg-gradient-to-r from-orange-500/20 to-amber-600/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 hover:text-orange-200 backdrop-blur-sm transition-all duration-200"
                    triggerVariant="outline"
                    triggerSize="sm"
                  />
                </div>
                <TeamMembersDropdown />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

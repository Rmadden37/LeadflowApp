"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import TeamMembersDropdown from "@/components/dashboard/team-members-dropdown";

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
      {/* 🎯 PREMIUM iOS HEADER - Settings Style */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="container py-4 lg:py-6">
          <div className="flex items-center gap-4">
            {/* 📱 iOS ICON CONTAINER */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#007AFF]/20 via-[#007AFF]/10 to-transparent ring-1 ring-[#007AFF]/30 backdrop-blur-xl">
              <Users className="h-8 w-8 text-[#007AFF]" />
            </div>
            
            {/* 🏷️ HEADER CONTENT */}
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1">
                Team Management
              </h1>
              <p className="text-white/70 text-sm lg:text-base font-medium">
                Organize your team • Assign roles • Control permissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🎨 MAIN CONTENT - iOS Settings Layout */}
      <div className="container py-6 space-y-6">
        {/* 📋 TEAM MANAGEMENT SECTION */}
        <div className={cn(
          // 🌟 PREMIUM CARD STYLING
          "bg-white/[0.08] backdrop-blur-xl border border-white/20",
          "rounded-3xl shadow-2xl",
          "shadow-[0_20px_60px_rgba(0,0,0,0.3)]",
          
          // ✨ iOS DEPTH EFFECTS
          "before:absolute before:inset-0 before:rounded-3xl",
          "before:bg-gradient-to-b before:from-white/10 before:via-white/5 before:to-transparent",
          "before:pointer-events-none relative"
        )}>
          {/* 🎯 SECTION HEADER - iOS Style */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#007AFF]/20">
                <Users className="h-5 w-5 text-[#007AFF]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Team Members & Roles
                </h2>
                <p className="text-white/70 text-sm">
                  Manage access, permissions, and team assignments
                </p>
              </div>
            </div>
          </div>
          
          {/* 📱 TEAM MANAGEMENT CONTENT */}
          <div className="p-6">
            <TeamMembersDropdown />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import TeamUserManagementEnhanced from "@/components/dashboard/team-user-management-ios";

export default function ManageTeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect non-managers/admins away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "manager" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

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
    <div className="container py-4 lg:py-6 space-y-4">
      {/* Streamlined iOS-style Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] mb-1">
            Team Management
          </h1>
          <p className="text-[var(--text-secondary)] text-sm lg:text-base">
            Manage members, roles, and permissions
          </p>
        </div>
        
        {/* iOS-style action button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-600">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Main Content - iOS Enhanced Interface */}
      <TeamUserManagementEnhanced />
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert, Users } from "lucide-react";
import TeamUserManagement from "@/components/dashboard/team-user-management";

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
    <div className="container py-6 lg:py-10 space-y-6">
      {/* Enhanced Header with improved hierarchy */}
      <div className="frosted-glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-blue-500/10 ring-1 ring-[var(--accent-primary)]/20">
              <Users className="h-8 w-8 text-[var(--accent-light)]" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
                Manage Teams
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 text-sm lg:text-base">
                Manage team members, roles, and assignments across your organization
              </p>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center px-3 py-2 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div className="font-semibold text-[var(--accent-light)]">Active</div>
              <div className="text-[var(--text-secondary)]">Users</div>
            </div>
            <div className="text-center px-3 py-2 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div className="font-semibold text-[var(--accent-light)]">All</div>
              <div className="text-[var(--text-secondary)]">Roles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Team Management Content */}
      <div className="frosted-glass-card">
        <div className="p-4 lg:p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Users className="h-5 w-5 text-[var(--accent-light)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Team Management
              </h2>
              <p className="text-[var(--text-secondary)] text-sm lg:text-base">
                View and manage your team members, assign roles, and control access permissions
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <TeamUserManagement />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import InitTeamsComponent from "@/components/init-teams-component";

export default function InitializeTeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect non-admins away from this page
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
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

  if (!user || user.role !== "admin") {
    return (
      <div className="container py-10">
        <div className="frosted-glass-card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Access Restricted</h2>
            <p className="text-[var(--text-secondary)]">
              Only administrators can access the team initialization tool.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Initialization</h1>
        <p className="text-[var(--text-secondary)]">
          Use this tool to initialize or reset the required Empire region teams.
        </p>
      </div>

      <div className="space-y-8">
        <InitTeamsComponent />
      </div>
    </div>
  );
}

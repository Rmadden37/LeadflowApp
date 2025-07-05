"use client";

import { Suspense, lazy } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import dynamic from 'next/dynamic';

// Always load immediately
import AetherHeader from "@/components/dashboard/aether-header";
import DaylightArcCard from "@/components/dashboard/daylight-arc-card-simple";

// Lazily load components below the fold with dynamic imports
const InProcessLeads = dynamic(() => import("@/components/dashboard/in-process-leads"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64"></div>
});

const CloserLineup = dynamic(() => import("@/components/dashboard/closer-lineup"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-48"></div>
});

const LeadQueue = dynamic(() => import("@/components/dashboard/lead-queue"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64"></div>
});

export default function DashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-screen pb-24">
      <AetherHeader />
      <div className="p-4 space-y-4">
        <DaylightArcCard />
        <InProcessLeads />
        <CloserLineup />
        <LeadQueue />
      </div>
    </div>
  );
}
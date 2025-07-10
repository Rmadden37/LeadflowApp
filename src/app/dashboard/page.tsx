"use client";

import { Suspense, lazy } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import dynamic from 'next/dynamic';

// Always load immediately
import AetherHeader from "@/components/dashboard/aether-header";
import AetherTabBar from "@/components/dashboard/aether-tab-bar";
import DaylightArcCard from "@/components/dashboard/daylight-arc-card-simple";

// Lazily load components below the fold with dynamic imports
const InProcessLeads = dynamic(() => import("@/components/dashboard/in-process-leads").then(mod => ({ default: mod.default })), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64"></div>,
  ssr: false
});

const CloserLineup = dynamic(() => import("@/components/dashboard/closer-lineup").then(mod => ({ default: mod.default })), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-48"></div>,
  ssr: false
});

const LeadQueue = dynamic(() => import("@/components/dashboard/lead-queue").then(mod => ({ default: mod.default })), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64"></div>,
  ssr: false
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
      {/* Always show the beautiful AetherTabBar - Aurelian's signature design */}
      <AetherTabBar />
    </div>
  );
}
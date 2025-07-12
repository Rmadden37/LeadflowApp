"use client";

import { useAuth } from "@/hooks/use-auth";
import dynamic from 'next/dynamic';

// Always load immediately
import AetherHeader from "@/components/dashboard/aether-header";
import AetherTabBar from "@/components/dashboard/aether-tab-bar";
import DaylightArcCard from "@/components/dashboard/daylight-arc-card-simple";

// Lazily load components below the fold with dynamic imports
const InProcessLeads = dynamic(() => import("@/components/dashboard/in-process-leads"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64 ios-skeleton"></div>,
  ssr: false
});

const CloserLineup = dynamic(() => import("@/components/dashboard/closer-lineup"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-48 ios-skeleton"></div>,
  ssr: false
});

const LeadQueue = dynamic(() => import("@/components/dashboard/lead-queue-clean"), {
  loading: () => <div className="frosted-glass-card p-6 animate-pulse h-64 ios-skeleton"></div>,
  ssr: false
});

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-screen dashboard-safe-content ios-optimized">
      <AetherHeader />
      
      {/* Native scrolling main content */}
      <div className="dashboard-content-container native-scroll-container">
        <div className="p-4 space-y-4 pt-safe-top-enhanced pb-safe-bottom-enhanced">
          <DaylightArcCard />
          <InProcessLeads />
          <CloserLineup />
          <LeadQueue />
        </div>
      </div>
      
      {/* Always show the beautiful AetherTabBar - Aurelian's signature design */}
      <AetherTabBar />
    </div>
  );
}
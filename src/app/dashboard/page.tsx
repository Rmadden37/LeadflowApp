"use client";

import { useAuth } from "@/hooks/use-auth";
import dynamic from 'next/dynamic';

// Always load immediately
import AetherHeader from "@/components/dashboard/aether-header";
import DaylightArcCard from "@/components/dashboard/daylight-arc-card-simple";

// PWA Components
import { usePWANotifications } from "@/components/pwa-push-notifications";

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
  
  // Initialize PWA notifications silently
  const PWANotifications = usePWANotifications();

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-screen dashboard-safe-content ios-optimized">
      {/* Silent PWA initialization */}
      {PWANotifications}
      
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
      
      {/* Mobile navigation is now handled by layout - no need for AetherTabBar here */}
    </div>
  );
}
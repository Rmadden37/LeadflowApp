"use client";

import { useAuth } from "@/hooks/use-auth";
import dynamic from 'next/dynamic';
import { useCallback } from 'react';

// Always load immediately
import AetherHeader from "@/components/dashboard/aether-header";
import DaylightArcCard from "@/components/dashboard/daylight-arc-card-simple";

// PWA Components
import { usePWANotifications } from "@/components/pwa-push-notifications";

// iOS Native Enhancements
import { useIOSPullToRefresh } from "@/hooks/use-ios-pull-refresh";
import { useIOSStatusBar } from "@/hooks/use-ios-status-bar";
import { IOSRefreshIndicator } from "@/components/ui/ios-loading";

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

  // iOS Status Bar Integration
  useIOSStatusBar({
    style: 'light-content',
    backgroundColor: '#000000',
    translucent: true,
  });

  // iOS Pull-to-Refresh Implementation
  const handleRefresh = useCallback(async () => {
    // Force refresh of all dashboard components
    await new Promise(resolve => setTimeout(resolve, 1500));
    window.location.reload();
  }, []);

  const {
    isPulling,
    pullDistance,
    isRefreshing,
    canRefresh,
    scrollElementRef,
  } = useIOSPullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: true,
  });

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-screen dashboard-safe-content ios-optimized">
      {/* Silent PWA initialization */}
      {PWANotifications}
      
      <AetherHeader />
      
      {/* iOS Pull-to-Refresh Container */}
      <div 
        ref={scrollElementRef}
        className="dashboard-content-container ios-pull-refresh-container ios-scroll ios-momentum-scroll relative overflow-auto"
        style={{ blockSize: 'calc(100vh - 120px)' }}
      >
        {/* iOS Refresh Indicator */}
        <IOSRefreshIndicator
          isVisible={isPulling || isRefreshing}
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
        
        {/* Main scrollable content */}
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
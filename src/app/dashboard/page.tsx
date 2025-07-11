"use client";

import { Suspense, lazy, useCallback, useState } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';
import PullToRefresh from "@/components/ui/pull-to-refresh";

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
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Simulate refresh - in real app, this would refresh data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success toast with iOS styling
      toast({
        title: "🔄 Dashboard Refreshed",
        description: "All data has been updated successfully.",
        variant: "success",
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "❌ Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  if (!user) return null; // Layout handles redirect

  return (
    <div className="min-h-screen dashboard-safe-content ios-optimized">
      <AetherHeader />
      
      <PullToRefresh 
        onRefresh={handleRefresh}
        className="dashboard-content-container"
        disabled={isRefreshing}
      >
        <div className="p-4 space-y-4 pt-safe-top-enhanced pb-safe-bottom-enhanced">
          <DaylightArcCard />
          <InProcessLeads />
          <CloserLineup />
          <LeadQueue />
        </div>
      </PullToRefresh>
      
      {/* Always show the beautiful AetherTabBar - Aurelian's signature design */}
      <AetherTabBar />
    </div>
  );
}
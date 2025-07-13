"use client";

import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileNavigationLayout from "@/components/ui/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // On mobile, wrap everything in MobileNavigationLayout to ensure bottom nav on all pages
  if (isMobile) {
    return (
      <MobileNavigationLayout>
        <DashboardSidebar>{children}</DashboardSidebar>
      </MobileNavigationLayout>
    );
  }
  
  // Desktop uses just the sidebar
  return <DashboardSidebar>{children}</DashboardSidebar>;
}
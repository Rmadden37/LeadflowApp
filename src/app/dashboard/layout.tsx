"use client";


import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Always use the sidebar layout with AetherTabBar - Aurelian's signature design
  const content = (
    <DashboardSidebar>{children}</DashboardSidebar>
  );
  
  // Return the beautiful sidebar layout for all devices
  return content;
}
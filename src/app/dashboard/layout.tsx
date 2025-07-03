"use client";

import React from "react";
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
  
  // Create base content with sidebar
  const content = (
    <DashboardSidebar>{children}</DashboardSidebar>
  );
  
  // For mobile, wrap with MobileNavigation component which includes the bottom nav
  if (isMobile) {
    return <MobileNavigation>{children}</MobileNavigation>;
  }
  
  // For desktop, return the standard sidebar layout
  return content;
}
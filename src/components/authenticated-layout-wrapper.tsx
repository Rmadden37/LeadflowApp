"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";

interface AuthenticatedLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayoutWrapper({ children }: AuthenticatedLayoutWrapperProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  // Don't show navigation on login page or while loading
  const isLoginPage = pathname === '/login';
  const isEurekaDemo = pathname === '/eureka-demo';
  
  // If user is not authenticated, loading, or on login page, just render children
  if (loading || !user || isLoginPage || isEurekaDemo) {
    return <>{children}</>;
  }
  
  // For authenticated users, wrap content with navigation
  // Check if we're already in a dashboard route (which has its own layout)
  const isDashboardRoute = pathname.startsWith('/dashboard');
  
  if (isDashboardRoute) {
    // Dashboard routes already have their own layout with navigation
    return <>{children}</>;
  }
  
  // For non-dashboard routes with authenticated users, wrap with navigation
  return (
    <DashboardSidebar>
      {children}
    </DashboardSidebar>
  );
}

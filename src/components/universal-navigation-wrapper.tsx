"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import AetherTabBar from "@/components/dashboard/aether-tab-bar";
import SwipeNavigationWrapper from "@/components/ui/swipe-navigation-wrapper";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UniversalNavigationWrapperProps {
  children: React.ReactNode;
}

export default function UniversalNavigationWrapper({ children }: UniversalNavigationWrapperProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  // Pages that should never have navigation
  const excludedRoutes = ['/login', '/eureka-demo'];
  const shouldExclude = excludedRoutes.some(route => pathname.startsWith(route));
  
  // If user is not authenticated, loading, or on excluded pages
  if (loading || !user || shouldExclude) {
    return <>{children}</>;
  }
  
  // Dashboard routes get full navigation treatment
  const isDashboardRoute = pathname.startsWith('/dashboard');
  
  if (isDashboardRoute) {
    // Dashboard routes get full navigation treatment
    return (
      <>
        <DashboardSidebar>{children}</DashboardSidebar>
        {isMobile && <AetherTabBar />}
      </>
    );
  }
  
  // Non-dashboard routes for authenticated users
  // Need: Back button + Home escape hatch + Swipe navigation
  return (
    <SwipeNavigationWrapper>
      <div className="min-h-screen bg-background">
        {/* iOS-style Navigation Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center px-4">
            <div className="flex items-center gap-3">
              {/* Back Button - iOS style */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              {/* Home Escape Hatch */}
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            </div>
            
            {/* Page Title */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-foreground">
                {getPageTitle(pathname)}
              </h1>
            </div>
            
            {/* User Avatar/Actions */}
            <div className="flex items-center">
              <div className="text-sm text-muted-foreground">
                {user.email?.split('@')[0]}
              </div>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Mobile: Always show bottom navigation for consistency */}
        {isMobile && <AetherTabBar />}
      </div>
    </SwipeNavigationWrapper>
  );
}

// Helper function to get page titles
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/admin-tools': 'Admin Tools',
    '/quick-answer': 'Quick Answer',
    // Add more as needed
  };
  
  return titles[pathname] || 'LeadFlow';
}

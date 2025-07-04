"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  UserCircle, 
  ClipboardList,
  PlusCircle, 
  Home,
  Settings,
  Users,
  Trophy,
  Brain,
  Monitor,
  MessageCircle
} from "lucide-react";
import AvailabilityToggle from "./availability-toggle";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useState } from "react";
import React from "react";
import dynamic from "next/dynamic";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadFormEnhanced = dynamic(() => import("./create-lead-form-enhanced"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

function DashboardSidebarContent() {
  usePushNotifications(); // Register push notifications and badge logic
  const { user, logout, loading } = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const pathname = usePathname();
  const { isMobile, setOpenMobile, openMobile } = useSidebar();
  
  // Listen for custom event to open create lead modal from bottom nav
  React.useEffect(() => {
    const handleOpenCreateLead = () => {
      setIsCreateLeadModalOpen(true);
    };
    window.addEventListener('open-create-lead', handleOpenCreateLead);
    return () => {
      window.removeEventListener('open-create-lead', handleOpenCreateLead);
    };
  }, []);

  // Debug: log isMobile and openMobile
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[Sidebar] isMobile:', isMobile, 'openMobile:', openMobile);
    }
  }, [isMobile, openMobile]);

  // Debug logging for user role
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Sidebar Debug - User data:', user);
      console.log('🎭 Current role:', user?.role);
      console.log('👤 User UID:', user?.uid);
      console.log('📧 User email:', user?.email);
      console.log('🏢 Team ID:', user?.teamId);
      
      // Log role-based conditions
      const isManager = user?.role === "manager";
      const isAdmin = user?.role === "admin";
      const isManagerOrAdmin = isManager || isAdmin;
      
      console.log('🔐 Role checks:', {
        isManager,
        isAdmin,
        isManagerOrAdmin,
        shouldShowManagerTools: isManagerOrAdmin
      });
    }
  }, [user]);

  // Debug log role state
  React.useEffect(() => {
    console.log('🔐 Sidebar role state:', {
      userRole: user?.role,
      isManager: user?.role === "manager",
      isAdmin: user?.role === "admin",
      isManagerOrAdmin: user?.role === "manager" || user?.role === "admin",
      isAdminOnly: user?.role === "admin"
    });
  }, [user?.role]);
  
    // Show loading state if auth is still loading
    if (loading) {
      return (
        <Sidebar collapsible="icon" className="border-r">
          <SidebarContent>
            <SidebarMenu>
              {[...Array(6)].map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md mx-2 my-1" />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      );
    }
  
    // Don't render if no user (will be redirected)
    if (!user) {
      return null;
    }
  
    const getAvatarFallbackText = () => {
      if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
      if (user?.email) return user.email.substring(0, 2).toUpperCase();
      return <UserCircle size={24} />;
    };
  
    // Explicitly check user roles
    const isManager = user?.role === "manager";
    const isAdmin = user?.role === "admin";
    const isManagerOrAdmin = isManager || isAdmin;
    const isAdminOnly = user?.role === "admin";

  // Helper to close sidebar on mobile after navigation
  const handleNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r no-horizontal-scroll"
    >
      <SidebarContent className="mb-10 no-horizontal-scroll">
        <SidebarMenu className="no-horizontal-scroll">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={`nav-item shadow-sm text-lg text-sidebar-primary group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center min-h-[48px] touch-manipulation${pathname === "/dashboard" ? " active" : ""}`}
              onClick={handleNav}
            >
              <Link href="/dashboard" className="w-full flex items-center">
                <Home className="h-6 w-6 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3 text-gray-700 dark:text-gray-100" />
                <span className="font-semibold group-data-[collapsible=icon]:hidden">Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Create Lead Button */}
          {(user?.role === "setter" || isManagerOrAdmin) && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsCreateLeadModalOpen(true)}
                className="nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center"
              >
                <PlusCircle className="h-6 w-6 text-green-500 dark:text-green-300 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                <span className="font-semibold group-data-[collapsible=icon]:hidden">Create New Lead</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Leaderboard */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={`nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/leaderboard" ? " active" : ""}`}
              onClick={handleNav}
            >
              <Link href="/dashboard/leaderboard">
                <Trophy className="h-6 w-6 text-yellow-500 dark:text-yellow-300 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                <span className="font-semibold group-data-[collapsible=icon]:hidden">Leaderboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Chat */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={`nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/chat" ? " active" : ""}`}
              onClick={handleNav}
            >
              <Link href="/dashboard/chat">
                <MessageCircle className="h-6 w-6 text-blue-500 dark:text-blue-300 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                <span className="font-semibold group-data-[collapsible=icon]:hidden">Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Separator className="my-3" />

          {/* Manager/Admin Tools */}
          {isManagerOrAdmin && (
            <>
              {/* For Managers: Show manager tools directly */}
              {isManager && !isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item shadow-sm${pathname === "/dashboard/lead-history" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/lead-history">
                        <ClipboardList className="h-5 w-5 text-gray-700 dark:text-gray-100" />
                        <span className="font-semibold">Lead History</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item shadow-sm${pathname === "/dashboard/performance-analytics" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/performance-analytics">
                        <Brain className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                        <span className="font-semibold">Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {/* For Admins: Show both Manager Tools and Admin Tools sections */}
              {isAdminOnly && (
                <>
                  <SidebarMenuItem>
                    <div className="flex items-center space-x-3 px-2 py-1 text-sm font-medium text-muted-foreground group-data-[collapsible=icon]:hidden shadow-sm rounded-md">
                      <Users className="h-4 w-4 text-gray-700 dark:text-gray-100" />
                      <span>Manager Tools</span>
                    </div>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/lead-history" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/lead-history">
                        <ClipboardList className="h-4 w-4 text-gray-700 dark:text-gray-100 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                        <span className="font-semibold group-data-[collapsible=icon]:hidden">Lead History</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm group-data-[collapsible=icon]:justify-center group_data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/manage-teams" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/manage-teams">
                        <Users className="h-4 w-4 text-gray-700 dark:text-gray-100 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                        <span className="font-semibold group-data-[collapsible=icon]:hidden">Manage Teams</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item ml-4 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/performance-analytics" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/performance-analytics">
                        <Brain className="h-4 w-4 text-blue-500 dark:text-blue-300 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                        <span className="font-semibold group-data-[collapsible=icon]:hidden">Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <div className="my-2" />

                  {/* Admin Tools */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={`nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/admin-tools" ? " active" : ""}`} onClick={handleNav}>
                      <Link href="/dashboard/admin-tools">
                        <Settings className="h-5 w-5 text-gray-700 dark:text-gray-100 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3" />
                        <span className="font-semibold group-data-[collapsible=icon]:hidden">Admin Tools</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <Separator className="my-2" />
            </>
          )}

          {/* Availability Toggle for closers */}
          {user?.role === "closer" && (
            <SidebarMenuItem>
              <div className="px-2 py-1">
                <AvailabilityToggle />
              </div>
            </SidebarMenuItem>
          )}

          {/* User Profile */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className={`nav-item shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:justify-start group-data-[collapsible=expanded]:pl-4 group-data-[collapsible=expanded]:items-center${pathname === "/dashboard/profile" ? " active" : ""}`}>
              <Link href="/dashboard/profile">
                <Avatar className="h-8 w-8 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=expanded]:mr-3">
                  <AvatarImage 
                    src={user?.avatarUrl || undefined} 
                    alt={user?.displayName || user?.email || 'User'} 
                  />
                  <AvatarFallback>
                    {getAvatarFallbackText()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">
                    {user?.displayName || user?.email}
                  </span>
                  <span className="truncate text-xs capitalize">{user?.role}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <div className="flex items-center space-x-2 group-data-[collapsible=icon]:space-x-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center">
                <Monitor className="h-4 w-4 group-data-[collapsible=icon]:mx-auto" />
                <span className="text-xs group-data-[collapsible=icon]:hidden">Theme</span>
              </div>
              <ThemeToggleButton />
            </div>
          </SidebarMenuItem>

          {/* Logout Button */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              size="sm"
              className="hover:bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* Render Create Lead Modal */}
      {isCreateLeadModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-auto p-4 animate-none" style={{inlineSize: '95vw'}}>
            <button
              onClick={() => setIsCreateLeadModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 dark:hover:text-white text-2xl font-bold z-10"
              aria-label="Close"
            >
              ×
            </button>
            <CreateLeadFormEnhanced isOpen={isCreateLeadModalOpen} onClose={() => setIsCreateLeadModalOpen(false)} />
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default function DashboardSidebar({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Show loading screen while auth is loading
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user (auth hook will handle redirect)
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <SidebarWithTrigger pathname={pathname}>{children}</SidebarWithTrigger>
      {/* Floating Chat Button */}
      {/* <FloatingChatButton /> */}
    </SidebarProvider>
  );
}

function SidebarWithTrigger({ pathname, children }: { pathname: string; children?: React.ReactNode }) {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <div className="flex h-screen w-full no-horizontal-scroll">
      {!isMobile && <DashboardSidebarContent />}
      <div className="flex-1 flex flex-col overflow-hidden no-horizontal-scroll">
        {!isMobile && (
          <div className="sticky top-0 z-40 w-full py-2 px-4 flex items-center">
            <SidebarTrigger
              className="mr-3 dark:text-white dark:hover:bg-slate-800/50 min-h-[44px] min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
              onClick={toggleSidebar}
            />
          </div>
        )}
        <main className={`flex-1 overflow-auto p-4 mobile-container ${isMobile ? 'pb-[calc(var(--bottom-nav-height)_+_1.5rem)]' : ''}`}>
          {children || "Dashboard content goes here"}
        </main>
      </div>
    </div>
  );
}
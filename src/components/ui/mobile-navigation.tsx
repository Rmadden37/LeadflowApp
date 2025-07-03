"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Trophy, 
  Users, 
  User,
  ClipboardList,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  BottomNav, 
  BottomNavProvider, 
  BottomNavContent, 
  BottomNavItem,
  useBottomNav 
} from "@/components/ui/bottom-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHapticFeedback } from "@/lib/haptic-feedback";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface MobileNavigationLayoutProps {
  children: React.ReactNode;
}

// Specialized dropdown navigation item component
const BottomNavDropdownItem = React.forwardRef<
  HTMLButtonElement,
  {
    icon?: React.ReactNode;
    label?: string;
    isActive?: boolean;
    menuItems: Array<{
      href: string;
      icon: React.ReactNode;
      label: string;
    }>;
  }
>(({ icon, label, isActive = false, menuItems, ...props }, ref) => {
  const haptic = useHapticFeedback();
  const router = useRouter();

  const handleMenuItemClick = (href: string) => {
    haptic.selection();
    router.push(href);
  };

  const content = (
    <>
      {icon && (
        <div className="relative flex items-center justify-center bottom-nav-icon">
          <div className="[&>svg]:size-[22px] [&>svg]:shrink-0 [&>svg]:stroke-[1.5px] transition-all duration-200 group-hover:scale-110">
            {icon}
          </div>
        </div>
      )}
      {label && (
        <span className="text-[10px] leading-tight tracking-tight truncate max-w-[70px] font-medium transition-all duration-200 group-hover:font-semibold bottom-nav-label">
          {label}
        </span>
      )}
      <ChevronDown className="h-3 w-3 opacity-60 mt-0.5" />
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-h-[44px] min-w-[60px] transition-all duration-200 ease-out outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 ios-button haptic-button bottom-nav-item ios-focus relative group",
            isActive 
              ? "text-[#007AFF] dark:text-[#0A84FF] scale-105 ios-bounce active" 
              : "text-gray-500/90 dark:text-gray-400/90 hover:text-gray-700 dark:hover:text-gray-300"
          )}
          onClick={() => haptic.selection()}
          {...props}
        >
          {content}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        side="top" 
        className="w-48 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-gray-200/50 dark:border-gray-800/50 shadow-xl"
      >
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.href}
            onClick={() => handleMenuItemClick(item.href)}
            className="flex items-center gap-3 py-3 px-4 text-sm font-medium cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center justify-center w-5 h-5">
              {item.icon}
            </div>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
BottomNavDropdownItem.displayName = "BottomNavDropdownItem";

// Main Mobile Navigation Component
export function MobileNavigation({ children }: MobileNavigationLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Define manager menu items
  const managerMenuItems = [
    {
      href: "/dashboard/lead-history",
      icon: <ClipboardList className="w-4 h-4" />,
      label: "All Team Leads"
    },
    {
      href: "/dashboard/manage-teams",
      icon: <Users className="w-4 h-4" />,
      label: "Manage Team"
    },
    {
      href: "/dashboard/performance-analytics",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Analytics"
    }
  ];

  return (
    <BottomNavProvider>
      <div className="main-content-with-bottom-nav">
        {children}
        <BottomNav>
          <BottomNavContent>
            <BottomNavItem 
              icon={<Home className="stroke-[1.5]" />} 
              label="Home" 
              href="/dashboard" 
              isActive={pathname === "/dashboard"}
            />
            <BottomNavItem 
              icon={<Trophy className="stroke-[1.5]" />} 
              label="Leaderboard" 
              href="/dashboard/leaderboard" 
              isActive={pathname.includes('/leaderboard')}
            />
            
            {(user?.role === "manager" || user?.role === "admin") && (
              <BottomNavDropdownItem
                icon={<Users className="stroke-[1.5]" />}
                label="Manage"
                isActive={pathname.includes('/manage') || pathname.includes('/lead-history') || pathname.includes('/manage-teams') || pathname.includes('/analytics')}
                menuItems={managerMenuItems}
              />
            )}
            <BottomNavItem 
              icon={<User className="stroke-[1.5]" />} 
              label="Profile" 
              href="/dashboard/profile" 
              isActive={pathname.includes('/profile')}
            />
          </BottomNavContent>
        </BottomNav>
      </div>
    </BottomNavProvider>
  );
}

// Manager Tools Sub-Navigation Component (Admin Tools removed - now in Profile)
const ManagerSubNav = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  
  const managerSections = [
    { 
      id: 'lead-history', 
      label: 'Lead History', 
      icon: ClipboardList, 
      href: '/dashboard/lead-history',
      description: 'View all lead activity'
    },
    { 
      id: 'manage-teams', 
      label: 'Teams', 
      icon: Users, 
      href: '/dashboard/manage-teams',
      description: 'Manage team members'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      href: '/dashboard/performance-analytics',
      description: 'Performance insights'
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Manager Tools
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your team and access analytics
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {managerSections.map((section) => {
          const Icon = section.icon;
          const isActive = pathname.includes(section.href.split('/').pop() || '');
          
          return (
            <Card 
              key={section.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isActive ? 'ring-2 ring-[#007AFF] bg-[#007AFF]/5' : ''
              }`}
              onClick={() => window.location.href = section.href}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-[#007AFF] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {section.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                  {isActive && (
                    <Badge className="bg-[#007AFF] text-white">Active</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Main Mobile Navigation Layout
export default function MobileNavigationLayout({ children }: MobileNavigationLayoutProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Don't render bottom nav if not mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  // Check if user has manager/admin permissions
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  // Define manager menu items
  const managerMenuItems = [
    {
      href: "/dashboard/lead-history",
      icon: <ClipboardList className="w-4 h-4" />,
      label: "All Team Leads"
    },
    {
      href: "/dashboard/manage-teams",
      icon: <Users className="w-4 h-4" />,
      label: "Manage Team"
    },
    {
      href: "/dashboard/performance-analytics",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Analytics"
    }
  ];

  // If we're in manager tools area, show the sub-navigation
  const showManagerSubNav = pathname.includes('/manager-tools') || 
    (pathname.includes('/lead-history') || 
     pathname.includes('/manage-teams') || 
     pathname.includes('/analytics')) && isManagerOrAdmin;

  return (
    <BottomNavProvider>
      <div className="main-content-with-bottom-nav">
        {showManagerSubNav ? <ManagerSubNav /> : children}
      </div>
      
      <BottomNav>
        <BottomNavContent>
          <BottomNavItem 
            icon={<Home className="stroke-[1.5]" />} 
            label="Home" 
            href="/dashboard" 
            isActive={pathname === "/dashboard"}
          />
          <BottomNavItem 
            icon={<Trophy className="stroke-[1.5]" />} 
            label="Leaderboard" 
            href="/dashboard/leaderboard" 
            isActive={pathname.includes('/leaderboard')}
          />
          
          {isManagerOrAdmin && (
            <BottomNavDropdownItem
              icon={<Users className="stroke-[1.5]" />}
              label="Manage"
              isActive={pathname.includes('/manage') || pathname.includes('/lead-history') || pathname.includes('/manage-teams') || pathname.includes('/analytics')}
              menuItems={managerMenuItems}
            />
          )}
          <BottomNavItem 
            icon={<User className="stroke-[1.5]" />} 
            label="Profile" 
            href="/dashboard/profile" 
            isActive={pathname.includes('/profile')}
          />
        </BottomNavContent>
      </BottomNav>
    </BottomNavProvider>
  );
}

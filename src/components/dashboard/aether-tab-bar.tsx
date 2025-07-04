"use client";

import { useState, useEffect } from "react";
import { Home, Users, Award, User, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface Tab {
  icon: any;
  label: string;
  path: string;
  hasNotification?: boolean;
  onClick?: () => void;
  requiredRoles?: string[];
}

export default function AetherTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Check for unread chat messages
  useEffect(() => {
    if (!user) return;
    
    const checkUnreadMessages = () => {
      try {
        const lastRead = parseInt(localStorage.getItem("team-chat-last-read") || "0", 10);
        const now = Date.now();
        // Simple check - if last read was more than 1 hour ago, show notification
        setHasUnreadChat(now - lastRead > 60 * 60 * 1000);
      } catch {
        // Handle localStorage errors gracefully
        setHasUnreadChat(false);
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const handleChatClick = () => {
    localStorage.setItem("team-chat-last-read", Date.now().toString());
    setHasUnreadChat(false);
  };

  const tabs: Tab[] = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Teams", path: "/dashboard/manage-teams", requiredRoles: ["manager", "admin"] },
    { icon: Award, label: "Leaderboard", path: "/dashboard/leaderboard" },
    { icon: MessageCircle, label: "Chat", path: "/dashboard/chat", hasNotification: hasUnreadChat, onClick: handleChatClick },
    { icon: User, label: "Profile", path: "/dashboard/profile" },
  ];

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => {
    if (!tab.requiredRoles) return true;
    return user?.role && tab.requiredRoles.includes(user.role);
  });

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.5)] backdrop-filter backdrop-blur-[20px] border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-lg mx-auto">
        {visibleTabs.map((tab) => {
          // Improved active state detection for nested routes
          const isActive = tab.path === "/dashboard" 
            ? pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !visibleTabs.some(t => t !== tab && pathname.startsWith(t.path)))
            : pathname.startsWith(tab.path);
            
          return (
            <Link 
              href={tab.path} 
              key={tab.path}
              className="flex flex-col items-center justify-center w-full py-2 relative"
              onClick={tab.onClick}
            >
              <div className="relative">
                <tab.icon 
                  className={`w-6 h-6 mb-1 transition-all ${
                    isActive 
                      ? "text-white animate-icon-pulse" 
                      : "text-[#A0A0A0]"
                  }`} 
                />
                {tab.hasNotification && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse border border-white/20" />
                )}
              </div>
              <span 
                className={`text-xs font-medium transition-all ${
                  isActive 
                    ? "text-white" 
                    : "text-[#A0A0A0]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
}

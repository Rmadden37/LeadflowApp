"use client";

import { useState } from "react";
import { Home, Users, Award, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AetherTabBar() {
  const pathname = usePathname();

  const tabs = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Teams", path: "/dashboard/manage-teams" },
    { icon: Award, label: "Leaderboard", path: "/dashboard/leaderboard" },
    { icon: User, label: "Profile", path: "/dashboard/profile" },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.5)] backdrop-filter backdrop-blur-[20px] border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-lg mx-auto">
        {tabs.map((tab) => {
          // Improved active state detection for nested routes
          const isActive = tab.path === "/dashboard" 
            ? pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !tabs.some(t => t !== tab && pathname.startsWith(t.path)))
            : pathname.startsWith(tab.path);
            
          return (
            <Link 
              href={tab.path} 
              key={tab.path}
              className="flex flex-col items-center justify-center w-full py-2"
            >
              <tab.icon 
                className={`w-6 h-6 mb-1 transition-all ${
                  isActive 
                    ? "text-white animate-icon-pulse" 
                    : "text-[#A0A0A0]"
                }`} 
              />
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

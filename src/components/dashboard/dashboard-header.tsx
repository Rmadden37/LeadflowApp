"use client";

import Link from "next/link";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {LogOut, UserCircle, PlusCircle, ChevronDown, Users, ClipboardList, BarChart3} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AvailabilityToggle from "./availability-toggle";
import {useState} from "react";
import dynamic from "next/dynamic";
import TeamChatButton from "./floating-team-chat-button";
import GearIcon from "@/components/ui/gear-icon";

// Dynamic import with Next.js dynamic to avoid circular dependency issues
const CreateLeadForm = dynamic(() => import("./create-lead-form"), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function DashboardHeader() {
  const {user, logout} = useAuth();
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

  const getAvatarFallbackText = () => {
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return <UserCircle size={24}/>;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/20 bg-white/95 dark:bg-black/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/95 dark:supports-[backdrop-filter]:bg-black/95 shadow-sm">
        <div className="flex h-16 items-center px-4">
          {/* Sidebar Toggle Button for mobile */}
          <button
            className="block lg:hidden p-2 mr-2"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const event = new CustomEvent('sidebar-toggle');
                window.dispatchEvent(event);
              }
            }}
            aria-label="Open sidebar"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" className="mr-6 sm:mr-8 flex items-center space-x-3 text-[#3574F2] dark:text-[#007AFF] group">
            <div className="p-3 bg-gradient-to-br from-[#3574F2]/20 to-[#5096F2]/10 dark:from-[#007AFF]/20 dark:to-[#0056CC]/10 rounded-xl group-hover:from-[#3574F2]/30 group-hover:to-[#5096F2]/20 dark:group-hover:from-[#007AFF]/30 dark:group-hover:to-[#0056CC]/20 transition-all duration-300 shadow-sm">
              {/* Light mode logo */}
              <img 
                src="https://imgur.com/oujPvCe.png" 
                alt="LeadFlow Logo" 
                className="h-8 w-8 object-contain transition-all duration-300 dark:hidden"
              />
              {/* Dark mode logo */}
              <img 
                src="https://imgur.com/eYR7cr2.png" 
                alt="LeadFlow Logo" 
                className="h-8 w-8 object-contain transition-all duration-300 hidden dark:block"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold font-headline bg-gradient-to-r from-[#3574F2] to-[#5096F2] dark:from-[#007AFF] dark:to-[#0056CC] bg-clip-text text-transparent">LeadFlow</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Lead History System</span>
            </div>
          </Link>
          
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 md:space-x-4 ml-auto">
            {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
              <Button 
                onClick={() => setIsCreateLeadModalOpen(true)} 
                variant="primary-solid" 
                size="sm" 
                className="hidden sm:flex bg-gradient-to-r from-[#007AFF] to-[#0056CC] hover:from-[#007AFF]/90 hover:to-[#0056CC]/90 shadow-lg shadow-[#007AFF]/25 hover:shadow-xl hover:shadow-[#007AFF]/30 transition-all duration-300 border-0 text-white dark:glow-ios-blue"
              >
                <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden md:inline">Create New Lead</span>
                <span className="md:hidden">Create</span>
              </Button>
            )}
            {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
              <Button 
                onClick={() => setIsCreateLeadModalOpen(true)} 
                variant="primary-solid" 
                size="sm" 
                className="sm:hidden bg-gradient-to-r from-[#007AFF] to-[#0056CC] hover:from-[#007AFF]/90 hover:to-[#0056CC]/90 shadow-lg shadow-[#007AFF]/25 border-0 text-white dark:glow-ios-blue"
              >
                <PlusCircle className="h-4 w-4 transition-all duration-300" />
              </Button>
            )}
            
            {/* Manager Tools Dropdown - Only for managers and admins */}
            {(user?.role === "manager" || user?.role === "admin") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-2 bg-white/10 dark:bg-slate-800/50 border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-slate-800/70 backdrop-blur-sm transition-all duration-200"
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden md:inline">Manage</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-gray-200/50 dark:border-gray-800/50 shadow-xl"
                >
                  <DropdownMenuItem 
                    className="flex items-center gap-3 py-3 px-4 text-sm font-medium cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => window.location.href = '/dashboard/lead-history'}
                  >
                    <ClipboardList className="h-4 w-4" />
                    All Team Leads
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center gap-3 py-3 px-4 text-sm font-medium cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => window.location.href = '/dashboard/manage-teams'}
                  >
                    <Users className="h-4 w-4" />
                    Manage Team
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center gap-3 py-3 px-4 text-sm font-medium cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => window.location.href = '/dashboard/performance-analytics'}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <TeamChatButton />
            
            {user?.role === "closer" && <AvailabilityToggle />}
            
            <Link 
              href="/dashboard/profile" 
              className="flex items-center space-x-2 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-300 group"
            >
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-border dark:border-white/20 shadow-sm">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-[#007AFF]/20 to-[#0056CC]/10 text-[#007AFF] font-semibold">
                  {getAvatarFallbackText()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-xs">
                <span className="font-semibold text-foreground">{user?.displayName || user?.email}</span>
                <span className="text-muted-foreground capitalize">{user?.role}</span>
              </div>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              aria-label="Logout" 
              className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300 group"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300" />
            </Button>
          </div>
        </div>
      </header>
      {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
        <CreateLeadForm
          isOpen={isCreateLeadModalOpen}
          onClose={() => setIsCreateLeadModalOpen(false)}
        />
      )}
    </>
  );
}

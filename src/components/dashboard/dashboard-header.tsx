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
      <header className="sticky top-0 z-40 w-full border-b border-border/10 bg-transparent dark:bg-transparent backdrop-blur-none shadow-none hidden lg:flex">
        <div className="flex h-14 items-center px-6">
          <Link href="/dashboard" className="mr-8 flex items-center space-x-3 text-[#3574F2] dark:text-[#007AFF] group">
            <div className="p-2.5 bg-gradient-to-br from-[#3574F2]/15 to-[#5096F2]/8 dark:from-[#007AFF]/15 dark:to-[#0056CC]/8 rounded-xl group-hover:from-[#3574F2]/25 group-hover:to-[#5096F2]/15 dark:group-hover:from-[#007AFF]/25 dark:group-hover:to-[#0056CC]/15 transition-all duration-300">
              {/* Light mode logo */}
              <img 
                src="https://imgur.com/oujPvCe.png" 
                alt="LeadFlow Logo" 
                className="h-7 w-7 object-contain transition-all duration-300 dark:hidden"
              />
              {/* Dark mode logo */}
              <img 
                src="https://imgur.com/eYR7cr2.png" 
                alt="LeadFlow Logo" 
                className="h-7 w-7 object-contain transition-all duration-300 hidden dark:block"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold font-headline bg-gradient-to-r from-[#3574F2] to-[#5096F2] dark:from-[#007AFF] dark:to-[#0056CC] bg-clip-text text-transparent">LeadFlow</span>
              <span className="text-xs text-muted-foreground/60">Lead History System</span>
            </div>
          </Link>
          
          <div className="flex items-center justify-end space-x-4 ml-auto">
            {(user?.role === "setter" || user?.role === "manager" || user?.role === "admin") && (
              <Button 
                onClick={() => setIsCreateLeadModalOpen(true)} 
                variant="primary-solid" 
                size="sm" 
                className="bg-gradient-to-r from-[#007AFF] to-[#0056CC] hover:from-[#007AFF]/90 hover:to-[#0056CC]/90 shadow-lg shadow-[#007AFF]/20 hover:shadow-xl hover:shadow-[#007AFF]/25 transition-all duration-300 border-0 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Lead
              </Button>
            )}
            
            {/* Manager Tools Dropdown - Only for managers and admins */}
            {(user?.role === "manager" || user?.role === "admin") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="items-center gap-2 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                  >
                    <Users className="h-4 w-4" />
                    Manage
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
            
            {user?.role === "closer" && <AvailabilityToggle />}
            
            <Link 
              href="/dashboard/profile" 
              className="flex items-center space-x-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 dark:hover:bg-white/5 backdrop-blur-sm transition-all duration-300 group"
            >
              <Avatar className="h-9 w-9 border-2 border-white/10 dark:border-white/20">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-[#007AFF]/20 to-[#0056CC]/10 text-[#007AFF] font-semibold text-sm">
                  {getAvatarFallbackText()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-foreground">{user?.displayName || user?.email}</span>
                <span className="text-muted-foreground/70 capitalize">{user?.role}</span>
              </div>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout} 
              aria-label="Logout" 
              className="h-9 w-9 hover:bg-red-50/10 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-300"
            >
              <LogOut className="h-4 w-4 transition-all duration-300" />
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

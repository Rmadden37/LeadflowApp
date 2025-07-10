"use client";


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface SimpleAvatarProps {
  user?: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
    avatarUrl?: string;
    photoURL?: string;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  showUserInfo?: boolean;
  fallbackColor?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12", 
  lg: "h-16 w-16",
  xl: "h-24 w-24"
};

export function SimpleAvatar({ 
  user, 
  size = "md", 
  className = "", 
  onClick,
  showUserInfo = false,
  fallbackColor = "bg-gradient-to-br from-blue-500 to-purple-500"
}: SimpleAvatarProps) {
  
  // Handle null/undefined user
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className={`${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all' : ''}`}>
          <AvatarFallback className={`${fallbackColor} text-white font-semibold`}>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        {showUserInfo && (
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-sm">Unknown User</div>
          </div>
        )}
      </div>
    );
  }
  
  // Simple fallback logic - just use Firebase URLs or initials
  const avatarSrc = user.photoURL || user.avatarUrl;
  
  // Generate initials
  const getInitials = () => {
    if (!user) return "?";
    const name = user.displayName || user.email || "";
    if (!name) return "?";
    
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar 
        className={`${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all' : ''}`}
        onClick={handleClick}
      >
        <AvatarImage 
          src={avatarSrc || undefined} 
          alt={user?.displayName || user?.email || "User avatar"} 
        />
        <AvatarFallback className={`${fallbackColor} text-white font-semibold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : size === 'xl' ? 'text-xl' : 'text-sm'}`}>
          {getInitials() === "?" ? <User className="h-4 w-4" /> : getInitials()}
        </AvatarFallback>
      </Avatar>
      
      {showUserInfo && (
        <div className="flex flex-col min-w-0">
          <div className="font-medium text-sm truncate">
            {user?.displayName || user?.email || "Unknown User"}
          </div>
          {user?.displayName && user?.email && (
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

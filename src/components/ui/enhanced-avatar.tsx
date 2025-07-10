"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { useAvatar } from "@/hooks/use-avatar";
import { Loader2 } from "lucide-react";

// Enhanced Avatar component with fallback system
const EnhancedAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    user?: {
      uid?: string;
      displayName?: string;
      email?: string;
      photoURL?: string;
      avatarUrl?: string;
    };
    fallbackText?: string;
    enableCsvLookup?: boolean;
    enableInitialsFallback?: boolean;
    showLoadingSpinner?: boolean;
  }
>(({ 
  className, 
  user, 
  fallbackText,
  enableCsvLookup = true,
  enableInitialsFallback = true,
  showLoadingSpinner = false,
  children,
  ...props 
}, ref) => {
  const { avatarSrc, isLoading, source } = useAvatar({
    uid: user?.uid,
    displayName: user?.displayName,
    email: user?.email,
    photoURL: user?.photoURL,
    avatarUrl: user?.avatarUrl,
    enableCsvLookup,
    enableInitialsFallback,
  });

  // Generate fallback text if not provided
  const getFallbackText = () => {
    if (fallbackText) return fallbackText;
    if (user?.displayName) return user.displayName.substring(0, 2).toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return "??";
  };

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {/* Loading overlay */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Avatar image with enhanced fallback */}
      <AvatarPrimitive.Image
        src={avatarSrc}
        alt={user?.displayName || user?.email || "User avatar"}
        className={cn("aspect-square h-full w-full", {
          "opacity-0": isLoading && showLoadingSpinner
        })}
        onError={(e) => {
          console.warn(`Avatar image failed to load: ${avatarSrc}`);
        }}
      />
      
      {/* Enhanced fallback */}
      <AvatarPrimitive.Fallback 
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full font-medium",
          // Style based on source for debugging
          source === 'firebase' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
          source === 'csv' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
          source === 'initials' && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
          source === 'placeholder' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
        )}
      >
        {getFallbackText()}
      </AvatarPrimitive.Fallback>
      
      {children}
    </AvatarPrimitive.Root>
  );
});

EnhancedAvatar.displayName = "EnhancedAvatar";

// Keep the original components for backward compatibility
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback, EnhancedAvatar };

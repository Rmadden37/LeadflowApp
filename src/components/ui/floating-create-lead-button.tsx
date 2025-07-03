"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useHapticFeedback } from "@/lib/haptic-feedback";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface FloatingCreateLeadButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function FloatingCreateLeadButton({ 
  className, 
  onClick 
}: FloatingCreateLeadButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const haptic = useHapticFeedback();
  const isMobile = useIsMobile();

  // Only show on dashboard page for mobile users
  const shouldShow = isMobile && pathname === '/dashboard';

  const handleClick = () => {
    haptic.medium(); // Strong haptic feedback for important action
    if (onClick) {
      onClick();
    } else {
      // Default behavior - navigate to create lead page
      router.push('/dashboard/create-lead');
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Fixed positioning - positioned above bottom nav and chat button
        "fixed bottom-28 left-1/2 transform -translate-x-1/2 z-40",
        // iOS-style prominent CTA design
        "w-16 h-16 bg-[#007AFF] hover:bg-[#0056CC] rounded-full shadow-lg",
        "flex items-center justify-center transition-all duration-200",
        "transform hover:scale-105 active:scale-95",
        // Glass morphism effect with white border
        "backdrop-blur-sm border-2 border-white/30",
        // Enhanced shadow for prominence
        "shadow-xl drop-shadow-lg",
        className
      )}
      aria-label="Create New Lead"
    >
      {/* Plus Icon */}
      <Plus className="w-8 h-8 text-white stroke-[3]" />
      
      {/* Subtle pulse animation for attention */}
      <div className="absolute inset-0 rounded-full bg-[#007AFF]/30 animate-ping" />
    </button>
  );
}

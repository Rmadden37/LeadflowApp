"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useHapticFeedback } from "@/lib/haptic-feedback";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface FloatingCreateLeadButtonProps {
  className?: string;
  onClick?: () => void;
}

/**
 * iOS-Native Floating Create Lead Button
 * 
 * Features authentic iOS interactions including:
 * - Spring physics animations with proper cubic-bezier timing
 * - Touch-responsive ripple effects at exact touch coordinates
 * - Dynamic shadow states that respond to press interactions
 * - Hardware-accelerated transforms for 60fps performance
 * - Immediate haptic feedback on touch start (iOS pattern)
 * - Proper iOS touch target sizing (44pt minimum)
 * - Authentic scale transforms (0.88 pressed, 1.05 hover)
 */
export default function FloatingCreateLeadButton({ 
  className, 
  onClick 
}: FloatingCreateLeadButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const haptic = useHapticFeedback();
  const isMobile = useIsMobile();

  // iOS-native interaction states
  const [isPressed, setIsPressed] = useState(false);
  const [ripplePosition, setRipplePosition] = useState<{x: number, y: number} | null>(null);

  // Only show on dashboard page for mobile users
  const shouldShow = isMobile && pathname === '/dashboard';

  // iOS-style touch interaction handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsPressed(true);
    
    // Calculate ripple position for iOS-style visual feedback
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setRipplePosition({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    
    // Immediate haptic feedback for responsive feel
    haptic.medium();
  }, [haptic]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    // Clear ripple after animation completes (iOS-authentic timing)
    setTimeout(() => setRipplePosition(null), 400);
  }, []);

  const handleClick = useCallback(() => {
    // Desktop fallback haptic feedback
    if (!('ontouchstart' in window)) {
      haptic.medium();
    }
    
    if (onClick) {
      onClick();
    } else {
      // Default behavior - navigate to create lead page
      router.push('/dashboard/create-lead');
    }
  }, [haptic, onClick, router]);

  if (!shouldShow) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        // Fixed positioning - positioned above bottom nav with safe overflow containment
        "fixed left-1/2 transform -translate-x-1/2 z-40",
        // Responsive bottom positioning - above bottom nav and safe areas
        "bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)]",
        // Ensure button stays within viewport bounds
        "max-w-[16rem] max-h-[16rem] overflow-hidden",
        // iOS-native button foundation
        "ios-button-base ios-button-interactive ios-touch-target",
        // Size and shape - iOS guidelines compliance
        "w-16 h-16 rounded-full flex items-center justify-center",
        // iOS-style prominent CTA design with proper iOS blue
        "bg-[#007AFF] text-white shadow-2xl",
        // iOS-native spring animations and interactions
        "transition-all duration-150 ease-out",
        "transform-gpu will-change-transform",
        // iOS-style pressed state with dynamic shadow
        isPressed 
          ? "scale-[0.88] shadow-[0_4px_15px_rgba(0,122,255,0.6)]" 
          : "scale-100 hover:scale-[1.05] active:scale-[0.95] shadow-[0_8px_30px_rgba(0,122,255,0.4)] hover:shadow-[0_12px_40px_rgba(0,122,255,0.5)]",
        // Glass morphism effect with enhanced iOS styling
        "backdrop-blur-xl border border-white/20",
        // Enhanced shadow removed from here since it's now in pressed state
        // Accessibility optimizations
        "tap-highlight-transparent select-none",
        // Focus states for accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className
      )}
      style={{
        // iOS spring physics curve
        transitionTimingFunction: isPressed 
          ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
          : 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      aria-label="Create New Lead"
    >
      {/* iOS-style ripple effect */}
      {ripplePosition && (
        <span 
          className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
        >
          <span
            className="absolute bg-white/25 rounded-full animate-ios-ripple"
            style={{
              insetInlineStart: ripplePosition.x - 8,
              insetBlockStart: ripplePosition.y - 8,
              inlineSize: 16,
              blockSize: 16,
            }}
          />
        </span>
      )}

      {/* iOS-style shine effect for premium feel */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] animate-ios-shine rounded-full" />
      
      {/* Plus Icon with iOS-style scaling */}
      <Plus 
        className={cn(
          "w-8 h-8 text-white stroke-[3] transition-transform duration-150",
          isPressed ? "scale-90" : "scale-100"
        )} 
      />
      
      {/* Subtle pulsing background for attention - iOS style */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-1000",
          "bg-[#007AFF]/20 animate-ping"
        )}
        style={{
          animationDuration: '3s',
          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
        }}
      />
    </button>
  );
}

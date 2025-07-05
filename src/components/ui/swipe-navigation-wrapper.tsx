"use client";

import React, { useEffect, useState } from 'react';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import SwipeIndicator from '@/components/ui/swipe-indicator';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeNavigationWrapperProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export default function SwipeNavigationWrapper({ 
  children, 
  disabled = false 
}: SwipeNavigationWrapperProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [showHint, setShowHint] = useState(false);
  
  // Only enable swipe navigation on mobile for non-dashboard routes
  const shouldEnableSwipe = isMobile && !pathname.startsWith('/dashboard') && !disabled;
  
  const { 
    swipeState, 
    containerRef, 
    isSwipeActive, 
    swipeProgress 
  } = useSwipeNavigation({
    enabled: shouldEnableSwipe,
    edgeThreshold: 20,
    completionThreshold: 0.35,
    velocityThreshold: 0.3
  });

  // Add haptic feedback on iOS devices
  useEffect(() => {
    if (!isSwipeActive) return;
    
    // Trigger light haptic feedback when swipe starts
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Progressive haptic feedback based on completion
    if (swipeProgress > 0.35 && swipeProgress < 0.4) {
      // Feedback when crossing completion threshold
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
  }, [isSwipeActive, swipeProgress]);

  // Prevent body scroll and optimize performance during active swipe
  useEffect(() => {
    if (isSwipeActive) {
      // Prevent scrolling and optimize for gesture
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      // iOS-specific optimizations with type assertions
      (document.body.style as any).webkitTouchCallout = 'none';
      (document.body.style as any).webkitTapHighlightColor = 'transparent';
    } else {
      // Restore normal behavior
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).webkitTouchCallout = '';
      (document.body.style as any).webkitTapHighlightColor = '';
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).webkitTouchCallout = '';
      (document.body.style as any).webkitTapHighlightColor = '';
    };
  }, [isSwipeActive]);

  // Show swipe hint for first-time users
  useEffect(() => {
    if (!shouldEnableSwipe) return;
    
    const hasSeenHint = localStorage.getItem('swipe-navigation-hint-seen');
    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShowHint(true);
        // Auto-hide after 4 seconds
        setTimeout(() => {
          setShowHint(false);
          localStorage.setItem('swipe-navigation-hint-seen', 'true');
        }, 4000);
      }, 1000); // Show after 1 second on first visit
      
      return () => clearTimeout(timer);
    }
    
    // Explicit return for all code paths
    return () => {};
  }, [shouldEnableSwipe]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen"
      style={{
        // Ensure proper touch behavior
        touchAction: shouldEnableSwipe ? 'pan-y pinch-zoom' : 'auto',
        // Add safe area padding for iOS
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {children}
      
      {/* Swipe visual feedback */}
      <SwipeIndicator 
        progress={swipeProgress} 
        isActive={isSwipeActive} 
      />
      
      {/* Edge swipe hint - subtle visual cue */}
      {shouldEnableSwipe && !isSwipeActive && (
        <div className="fixed left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-blue-600/20 to-transparent pointer-events-none z-10" />
      )}
      
      {/* First-time user hint */}
      {showHint && shouldEnableSwipe && (
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-white/20 animate-pulse">
            <div className="flex items-center gap-2 text-sm">
              <span>👆</span>
              <span>Swipe from edge to go back</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

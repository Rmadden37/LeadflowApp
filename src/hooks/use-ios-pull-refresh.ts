/**
 * ✨ AURELIAN'S iOS PULL-TO-REFRESH HOOK
 * 
 * Authentic iOS pull-to-refresh pattern with:
 * - Native iOS momentum and physics
 * - Haptic feedback integration
 * - Visual feedback with iOS-style indicators
 * - Performance optimized for 60fps
 */

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const useIOSPullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
}: PullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  });

  const touchStartY = useRef<number>(0);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const isScrolledToTop = useRef<boolean>(true);

  // Check if element is scrolled to top
  const checkScrollPosition = useCallback(() => {
    if (!scrollElementRef.current) return;
    isScrolledToTop.current = scrollElementRef.current.scrollTop === 0;
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || state.isRefreshing) return;
    
    checkScrollPosition();
    if (isScrolledToTop.current) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [enabled, state.isRefreshing, checkScrollPosition]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || state.isRefreshing || !isScrolledToTop.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      
      // Apply iOS-style resistance
      const adjustedDistance = Math.pow(deltaY / resistance, 0.8);
      const pullDistance = Math.min(adjustedDistance, threshold * 1.5);
      
      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        canRefresh: pullDistance >= threshold,
      }));

      // Haptic feedback when reaching threshold
      if (pullDistance >= threshold && !state.canRefresh) {
        if (navigator.vibrate) {
          navigator.vibrate(25);
        }
      }
    }
  }, [enabled, state.isRefreshing, state.canRefresh, threshold, resistance]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state.isRefreshing) return;

    if (state.canRefresh) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
      }));

      // Haptic feedback for refresh action
      if (navigator.vibrate) {
        navigator.vibrate([50, 25, 50]);
      }

      try {
        await onRefresh();
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false,
        }));
      }
    } else {
      // Animate back to normal position
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
      }));
    }
  }, [enabled, state.isRefreshing, state.canRefresh, onRefresh]);

  // Set up touch listeners
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('scroll', checkScrollPosition, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('scroll', checkScrollPosition);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, checkScrollPosition]);

  return {
    ...state,
    scrollElementRef,
    refreshIndicatorStyle: {
      transform: `translateY(${state.pullDistance}px)`,
      opacity: Math.min(state.pullDistance / threshold, 1),
    },
  };
};

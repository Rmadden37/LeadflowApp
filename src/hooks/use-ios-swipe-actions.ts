/**
 * ✨ AURELIAN'S iOS SWIPE ACTIONS HOOK
 * 
 * Authentic iOS swipe-to-action pattern with:
 * - Native iOS swipe physics and momentum
 * - Multiple action support (like iOS Mail)
 * - Haptic feedback integration
 * - Proper action thresholds and animations
 */

"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color: 'blue' | 'red' | 'orange' | 'green' | 'gray';
  onAction: () => void | Promise<void>;
  destructive?: boolean;
}

interface SwipeToActionOptions {
  actions: SwipeAction[];
  enabled?: boolean;
  threshold?: number;
  maxSwipeDistance?: number;
}

interface SwipeState {
  isSwipeActive: boolean;
  swipeDistance: number;
  direction: 'left' | 'right' | null;
  activeActionIndex: number | null;
  isPerformingAction: boolean;
}

export const useIOSSwipeActions = ({
  actions,
  enabled = true,
  threshold = 80,
  maxSwipeDistance = 200,
}: SwipeToActionOptions) => {
  const [state, setState] = useState<SwipeState>({
    isSwipeActive: false,
    swipeDistance: 0,
    direction: null,
    activeActionIndex: null,
    isPerformingAction: false,
  });

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const swipeStarted = useRef<boolean>(false);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || state.isPerformingAction) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeStarted.current = false;
  }, [enabled, state.isPerformingAction]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || state.isPerformingAction) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Check if this is a horizontal swipe
    if (!swipeStarted.current) {
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10;
      if (isHorizontalSwipe) {
        swipeStarted.current = true;
        e.preventDefault();
      } else if (Math.abs(deltaY) > 10) {
        // This is a vertical scroll, don't interfere
        return;
      }
    }

    if (swipeStarted.current) {
      e.preventDefault();
      
      const direction = deltaX > 0 ? 'right' : 'left';
      const swipeDistance = Math.min(Math.abs(deltaX), maxSwipeDistance);
      
      // Calculate active action based on swipe distance
      let activeActionIndex: number | null = null;
      if (swipeDistance >= threshold) {
        const actionIndex = Math.floor((swipeDistance - threshold) / (threshold * 0.8));
        activeActionIndex = Math.min(actionIndex, actions.length - 1);
      }

      setState(prev => ({
        ...prev,
        isSwipeActive: swipeDistance > 20,
        swipeDistance,
        direction,
        activeActionIndex,
      }));

      // Haptic feedback when reaching action threshold
      if (activeActionIndex !== null && activeActionIndex !== state.activeActionIndex) {
        if (navigator.vibrate) {
          navigator.vibrate(25);
        }
      }
    }
  }, [enabled, state.isPerformingAction, state.activeActionIndex, threshold, maxSwipeDistance, actions.length]);

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state.isPerformingAction || !swipeStarted.current) return;

    if (state.activeActionIndex !== null && actions[state.activeActionIndex]) {
      setState(prev => ({ ...prev, isPerformingAction: true }));
      
      // Strong haptic feedback for action execution
      if (navigator.vibrate) {
        navigator.vibrate([50, 25, 50]);
      }

      try {
        await actions[state.activeActionIndex].onAction();
      } finally {
        setState({
          isSwipeActive: false,
          swipeDistance: 0,
          direction: null,
          activeActionIndex: null,
          isPerformingAction: false,
        });
      }
    } else {
      // Animate back to normal position
      setState({
        isSwipeActive: false,
        swipeDistance: 0,
        direction: null,
        activeActionIndex: null,
        isPerformingAction: false,
      });
    }

    swipeStarted.current = false;
  }, [enabled, state.isPerformingAction, state.activeActionIndex, actions]);

  // Set up touch listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Get action colors
  const getActionColor = useCallback((color: SwipeAction['color']) => {
    const colors = {
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      green: 'bg-green-500',
      gray: 'bg-gray-500',
    };
    return colors[color];
  }, []);

  return {
    ...state,
    elementRef,
    swipeContainerStyle: {
      transform: `translateX(${state.direction === 'left' ? -state.swipeDistance : state.swipeDistance}px)`,
      transition: state.isSwipeActive ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    getActionColor,
    visibleActions: state.isSwipeActive ? actions.slice(0, Math.floor(state.swipeDistance / threshold) + 1) : [],
  };
};

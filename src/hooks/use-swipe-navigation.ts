"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeNavigationConfig {
  enabled?: boolean;
  edgeThreshold?: number; // Distance from edge to start gesture
  completionThreshold?: number; // Percentage to complete navigation
  velocityThreshold?: number; // Minimum velocity to complete
}

interface SwipeState {
  isActive: boolean;
  startX: number;
  currentX: number;
  progress: number; // 0-1 representing completion
  velocity: number;
}

export function useSwipeNavigation(config: SwipeNavigationConfig = {}) {
  const {
    enabled = true,
    edgeThreshold = 20,
    completionThreshold = 0.3,
    velocityThreshold = 0.5
  } = config;
  
  const router = useRouter();
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isActive: false,
    startX: 0,
    currentX: 0,
    progress: 0,
    velocity: 0
  });
  
  const touchStartTimeRef = useRef<number>(0);
  const lastTouchXRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const { clientX } = touch;
    
    // Only activate if touching near the left edge
    if (clientX <= edgeThreshold) {
      e.preventDefault();
      
      touchStartTimeRef.current = Date.now();
      lastTouchXRef.current = clientX;
      
      setSwipeState({
        isActive: true,
        startX: clientX,
        currentX: clientX,
        progress: 0,
        velocity: 0
      });
    }
  }, [enabled, edgeThreshold]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!swipeState.isActive) return;
    
    const touch = e.touches[0];
    const { clientX } = touch;
    
    // Prevent scrolling during swipe
    e.preventDefault();
    
    const deltaX = clientX - swipeState.startX;
    const screenWidth = window.innerWidth;
    
    // Only allow rightward swipes
    if (deltaX > 0) {
      const progress = Math.min(deltaX / screenWidth, 1);
      
      // Calculate velocity
      const currentTime = Date.now();
      const timeDelta = currentTime - touchStartTimeRef.current;
      const positionDelta = clientX - lastTouchXRef.current;
      const velocity = timeDelta > 0 ? positionDelta / timeDelta : 0;
      
      lastTouchXRef.current = clientX;
      
      setSwipeState(prev => ({
        ...prev,
        currentX: clientX,
        progress,
        velocity
      }));
    }
  }, [swipeState.isActive, swipeState.startX]);

  const completeNavigation = useCallback(() => {
    setSwipeState(prev => ({ ...prev, progress: 1 }));
    
    // Smooth animation to completion
    const animate = () => {
      setSwipeState(prev => {
        if (prev.progress >= 1) {
          // Navigation complete - trigger router back
          setTimeout(() => router.back(), 100);
          return { ...prev, isActive: false, progress: 0 };
        }
        
        const newProgress = Math.min(prev.progress + 0.1, 1);
        return { ...prev, progress: newProgress };
      });
      
      if (swipeState.progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [router, swipeState.progress]);

  const cancelNavigation = useCallback(() => {
    // Smooth animation back to 0
    const animate = () => {
      setSwipeState(prev => {
        if (prev.progress <= 0) {
          return { ...prev, isActive: false, progress: 0 };
        }
        
        const newProgress = Math.max(prev.progress - 0.15, 0);
        return { ...prev, progress: newProgress };
      });
      
      if (swipeState.progress > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [swipeState.progress]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isActive) return;
    
    const { progress, velocity } = swipeState;
    
    // Determine if we should complete or cancel the navigation
    const shouldComplete = 
      progress >= completionThreshold || 
      (progress > 0.1 && velocity >= velocityThreshold);
    
    if (shouldComplete) {
      completeNavigation();
    } else {
      cancelNavigation();
    }
  }, [swipeState, completionThreshold, velocityThreshold, completeNavigation, cancelNavigation]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const options = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);
    container.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    swipeState,
    containerRef,
    isSwipeActive: swipeState.isActive,
    swipeProgress: swipeState.progress
  };
}

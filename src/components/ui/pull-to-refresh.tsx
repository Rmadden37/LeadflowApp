"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { HapticFeedback } from '@/lib/haptic-feedback';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>; // @ts-ignore - Function props are allowed in client components
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = '',
  threshold = 80,
  maxPull = 120,
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isActiveRef = useRef(false);
  const scrollTopRef = useRef(0);
  const hapticTriggeredRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only activate pull-to-refresh if at the top of the scroll container
    scrollTopRef.current = container.scrollTop;
    if (scrollTopRef.current > 5) return;
    
    startYRef.current = e.touches[0].clientY;
    isActiveRef.current = true;
    hapticTriggeredRef.current = false;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isActiveRef.current || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 5) {
      isActiveRef.current = false;
      return;
    }
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    
    // Only handle downward pulls
    if (deltaY <= 0) return;
    
    // Prevent default scrolling behavior
    e.preventDefault();
    
    // Apply elastic resistance
    const resistance = 0.5;
    const adjustedDelta = Math.min(deltaY * resistance, maxPull);
    
    setPullDistance(adjustedDelta);
    
    // Trigger haptic feedback when threshold is reached
    const reachedThreshold = adjustedDelta >= threshold;
    if (reachedThreshold && !hapticTriggeredRef.current) {
      HapticFeedback.medium();
      hapticTriggeredRef.current = true;
    }
    
    setCanRefresh(reachedThreshold);
  }, [disabled, isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isActiveRef.current) return;
    
    isActiveRef.current = false;
    
    if (canRefresh && pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      HapticFeedback.success();
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        HapticFeedback.error();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Animate back to original position
    setPullDistance(0);
    setCanRefresh(false);
    hapticTriggeredRef.current = false;
  }, [canRefresh, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const indicatorOpacity = Math.min(pullDistance / 40, 1);
  const rotation = refreshProgress * 180;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
        transition: isActiveRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full flex items-center justify-center z-50"
        style={{
          opacity: indicatorOpacity,
          transition: isActiveRef.current ? 'none' : 'opacity 0.2s ease',
        }}
      >
        <div className="bg-background/95 backdrop-blur-md border border-border rounded-full p-3 shadow-lg">
          <RefreshCw 
            className={`h-5 w-5 text-primary transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            } ${canRefresh ? 'text-green-500' : 'text-muted-foreground'}`}
            style={{
              transform: isRefreshing ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s ease',
            }}
          />
        </div>
      </div>
      
      {children}
    </div>
  );
}

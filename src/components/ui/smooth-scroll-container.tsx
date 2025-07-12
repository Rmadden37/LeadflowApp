/**
 * AURELIAN SALOMAN'S ULTRA-SMOOTH SCROLL CONTAINER
 * 
 * This component implements the smoothest possible scrolling for iOS,
 * with intelligent performance optimizations and memory management.
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SmoothScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  height?: string;
  maxHeight?: string;
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  enableInfiniteScroll?: boolean;
  onLoadMore?: () => Promise<void>;
  loadingThreshold?: number;
  debug?: boolean;
}

interface ScrollState {
  isScrolling: boolean;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isAtTop: boolean;
  isAtBottom: boolean;
  velocity: number;
  direction: 'up' | 'down' | 'idle';
}

export function SmoothScrollContainer({
  children,
  className,
  height = 'h-full',
  maxHeight,
  enablePullToRefresh = false,
  onRefresh,
  enableInfiniteScroll = false,
  onLoadMore,
  loadingThreshold = 100,
  debug = false
}: SmoothScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef<ScrollState>({
    isScrolling: false,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isAtTop: true,
    isAtBottom: false,
    velocity: 0,
    direction: 'idle'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Refs for performance tracking
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const velocityBufferRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  // Touch tracking for pull-to-refresh
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isPulling = useRef(false);

  // Calculate smooth velocity
  const calculateVelocity = useCallback((currentScrollTop: number, timestamp: number) => {
    const deltaScroll = currentScrollTop - lastScrollTop.current;
    const deltaTime = timestamp - lastScrollTime.current;

    if (deltaTime === 0) return 0;

    const instantVelocity = deltaScroll / deltaTime;
    
    // Add to velocity buffer for smoothing
    velocityBufferRef.current.push(instantVelocity);
    if (velocityBufferRef.current.length > 5) {
      velocityBufferRef.current.shift();
    }

    // Calculate smoothed velocity
    const sum = velocityBufferRef.current.reduce((acc, v) => acc + v, 0);
    return sum / velocityBufferRef.current.length;
  }, []);

  // Optimized scroll handler
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const timestamp = performance.now();
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Calculate velocity
    const velocity = calculateVelocity(scrollTop, timestamp);
    const direction = velocity > 0.1 ? 'down' : velocity < -0.1 ? 'up' : 'idle';

    // Update scroll state
    const newState: ScrollState = {
      isScrolling: true,
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtTop: scrollTop <= 1,
      isAtBottom: scrollTop >= scrollHeight - clientHeight - 1,
      velocity,
      direction
    };

    scrollStateRef.current = newState;
    lastScrollTop.current = scrollTop;
    lastScrollTime.current = timestamp;

    // Infinite scroll detection
    if (enableInfiniteScroll && onLoadMore && !isLoadingMore) {
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom <= loadingThreshold) {
        setIsLoadingMore(true);
        onLoadMore().finally(() => setIsLoadingMore(false));
      }
    }

    // Clear scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      scrollStateRef.current.isScrolling = false;
      if (debug) {
        console.log('📜 Scroll ended');
      }
    }, 150);

    if (debug) {
      console.log('📜 Scroll:', { scrollTop, velocity, direction });
    }
  }, [calculateVelocity, enableInfiniteScroll, onLoadMore, isLoadingMore, loadingThreshold, debug]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enablePullToRefresh) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 5) return;

    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    isPulling.current = false;
  }, [enablePullToRefresh]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enablePullToRefresh) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 5) return;

    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;

    if (deltaY > 20 && !isPulling.current) {
      isPulling.current = true;
      e.preventDefault();
    }

    if (isPulling.current) {
      e.preventDefault();
      const pullAmount = Math.min(deltaY * 0.4, 80);
      setPullDistance(pullAmount);

      if (debug) {
        console.log('🔄 Pull distance:', pullAmount);
      }
    }
  }, [enablePullToRefresh, debug]);

  const handleTouchEnd = useCallback(() => {
    if (!enablePullToRefresh || !isPulling.current) return;

    const container = containerRef.current;
    if (!container) return;

    if (pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      onRefresh().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }

    isPulling.current = false;
  }, [enablePullToRefresh, pullDistance, onRefresh, isRefreshing]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scroll listener with passive optimization
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Touch listeners for pull-to-refresh
    if (enablePullToRefresh) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      
      if (enablePullToRefresh) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }

      // Cleanup timeouts and RAF
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      const currentRaf = rafRef.current;
      if (currentRaf) {
        cancelAnimationFrame(currentRaf);
      }
    };
  }, [handleScroll, handleTouchStart, handleTouchMove, handleTouchEnd, enablePullToRefresh]);

  // Calculate pull-to-refresh indicator opacity and rotation
  const pullProgress = Math.min(pullDistance / 60, 1);
  const indicatorOpacity = Math.min(pullDistance / 30, 1);
  const indicatorRotation = pullProgress * 180;

  return (
    <div
      ref={containerRef}
      className={cn(
        // Base styles
        'relative overflow-auto scroll-container',
        // iOS-specific optimizations
        'ios-momentum-scroll',
        // Custom height
        height,
        // Debug styles
        debug && 'outline outline-2 outline-blue-500',
        className
      )}
      style={{
        maxHeight: maxHeight,
        // Hardware acceleration
        transform: `translateY(${pullDistance * 0.3}px) translateZ(0)`,
        // Smooth transition when not pulling
        transition: isPulling.current ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        // Custom CSS properties for child optimization
        '--scroll-velocity': scrollStateRef.current.velocity.toString(),
        '--scroll-direction': scrollStateRef.current.direction,
        '--is-scrolling': scrollStateRef.current.isScrolling ? '1' : '0'
      } as React.CSSProperties}
    >
      {/* Pull-to-refresh indicator */}
      {enablePullToRefresh && (
        <div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-50 flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm transition-opacity duration-200"
          style={{
            opacity: indicatorOpacity,
            transform: `translateX(-50%) translateY(${pullDistance - 32}px) rotate(${indicatorRotation}deg)`
          }}
        >
          {isRefreshing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-white/70" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="scroll-content">
        {children}
      </div>

      {/* Infinite scroll loader */}
      {enableInfiniteScroll && isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="ml-2 text-white/60 text-sm">Loading more...</span>
        </div>
      )}

      {/* Debug info */}
      {debug && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
          <div>Scroll: {scrollStateRef.current.scrollTop.toFixed(0)}</div>
          <div>Velocity: {scrollStateRef.current.velocity.toFixed(2)}</div>
          <div>Direction: {scrollStateRef.current.direction}</div>
          <div>Pull: {pullDistance.toFixed(0)}</div>
        </div>
      )}
    </div>
  );
}

export default SmoothScrollContainer;

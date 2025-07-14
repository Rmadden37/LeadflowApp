"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface FastLoadingProps {
  message?: string;
  showProgress?: boolean;
  timeout?: number;
  onTimeout?: () => void;
  className?: string;
}

/**
 * OPTIMIZED LOADING COMPONENT
 * Provides immediate visual feedback and handles timeout scenarios
 */
export function FastLoading({ 
  message = "Loading...",
  showProgress = false,
  timeout = 3000,
  onTimeout,
  className = ""
}: FastLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!showProgress && !timeout) return;

    let progressInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (showProgress) {
      // Fake progress for better UX
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Slow down near completion
          return prev + Math.random() * 15;
        });
      }, 200);
    }

    if (timeout && onTimeout) {
      timeoutId = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout();
      }, timeout);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showProgress, timeout, onTimeout]);

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gray-900 loading-screen ${className}`}>
      <div className="text-center space-y-4">
        {/* Fast spinner with hardware acceleration */}
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto initial-loading-spinner" />
          {hasTimedOut && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {/* Loading message */}
        <div className="space-y-2">
          <p className="text-white text-lg font-medium critical-content">{message}</p>
          
          {showProgress && (
            <div className="w-64 mx-auto">
              <div className="w-full bg-gray-700 rounded-full h-2 loading-progress">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 loading-progress"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {Math.round(Math.min(progress, 100))}%
              </p>
            </div>
          )}
          
          {hasTimedOut && (
            <p className="text-yellow-400 text-sm">
              Taking longer than expected... 
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SKELETON LOADER COMPONENT
 * For individual component loading states
 */
interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
}

export function FastSkeleton({ 
  className = "", 
  height = "h-4", 
  width = "w-full",
  rounded = false 
}: SkeletonProps) {
  return (
    <div 
      className={`
        loading-skeleton 
        ${height} 
        ${width} 
        ${rounded ? 'rounded-full' : 'rounded'} 
        ${className}
      `}
    />
  );
}

/**
 * COMPONENT LOADING WRAPPER
 * Provides consistent loading states for dashboard components
 */
interface ComponentLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  className?: string;
}

export function ComponentLoading({ 
  isLoading, 
  children, 
  skeleton,
  className = ""
}: ComponentLoadingProps) {
  if (isLoading) {
    return (
      <div className={`dashboard-component-loading ${className}`}>
        {skeleton || (
          <div className="space-y-3 p-6">
            <FastSkeleton height="h-6" width="w-3/4" />
            <FastSkeleton height="h-4" width="w-full" />
            <FastSkeleton height="h-4" width="w-5/6" />
            <FastSkeleton height="h-32" rounded />
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

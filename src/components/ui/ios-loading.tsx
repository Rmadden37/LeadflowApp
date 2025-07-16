/**
 * ✨ AURELIAN'S iOS ACTIVITY INDICATOR COMPONENT
 * 
 * Authentic iOS loading states with:
 * - Native iOS activity indicator animation
 * - System-appropriate sizing and colors
 * - Performance optimized SVG animations
 * - Accessibility compliance
 */

"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface IOSActivityIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const IOSActivityIndicator: React.FC<IOSActivityIndicatorProps> = ({
  size = 'medium',
  color = 'primary',
  className,
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'text-blue-500',
    secondary: 'text-gray-500',
    white: 'text-white',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <svg
        className={cn(
          'animate-spin',
          colorClasses[color]
        )}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

interface IOSSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

export const IOSSkeleton: React.FC<IOSSkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-300 dark:bg-gray-600';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'ios-skeleton-wave',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        variant === 'text' && !height && 'h-4',
        variant === 'circular' && !width && !height && 'w-10 h-10',
        variant === 'rectangular' && !width && 'w-full',
        variant === 'rectangular' && !height && 'h-32',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

interface IOSLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  children?: React.ReactNode;
  backdrop?: boolean;
}

export const IOSLoadingOverlay: React.FC<IOSLoadingOverlayProps> = ({
  isVisible,
  message,
  children,
  backdrop = true,
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      backdrop && 'bg-black/20 backdrop-blur-sm'
    )}>
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-xs w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <IOSActivityIndicator size="large" />
          {message && (
            <p className="text-gray-700 dark:text-gray-300 text-center font-medium">
              {message}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

interface IOSRefreshIndicatorProps {
  isVisible: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export const IOSRefreshIndicator: React.FC<IOSRefreshIndicatorProps> = ({
  isVisible,
  isRefreshing,
  pullDistance,
  threshold,
}) => {
  if (!isVisible) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div 
      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full flex items-center justify-center h-16 w-16 z-10"
      style={{
        transform: `translateX(-50%) translateY(${Math.max(pullDistance - 64, -64)}px)`,
      }}
    >
      <div className="relative">
        {isRefreshing ? (
          <IOSActivityIndicator size="medium" color="primary" />
        ) : (
          <div
            className="w-6 h-6 border-2 border-gray-300 rounded-full relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              borderTopColor: progress >= 1 ? '#007AFF' : '#D1D5DB',
            }}
          >
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-300 rounded-full" 
                 style={{ backgroundColor: progress >= 1 ? '#007AFF' : '#D1D5DB' }} />
          </div>
        )}
      </div>
    </div>
  );
};

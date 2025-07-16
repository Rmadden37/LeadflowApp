/**
 * AURELIAN SALOMAN'S ULTRA-OPTIMIZED MOBILE LEAD CARD
 * 
 * This component demonstrates all the iOS performance optimizations
 * applied to a real-world component that appears in lists.
 */

"use client";

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Phone, RotateCcw, CheckCircle2, User, Clock, MapPin } from 'lucide-react';
import { format, differenceInMinutes, isPast } from 'date-fns';
import { useViewportOptimization } from '@/hooks/use-viewport-optimization';
import { Lead } from '@/types';

interface OptimizedMobileLeadCardProps {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onCall: (lead: Lead) => void;
  onReschedule: (lead: Lead) => void;
  onComplete: (lead: Lead) => void;
  index?: number;
  isSwipeEnabled?: boolean;
}

const OptimizedMobileLeadCard = React.memo(function OptimizedMobileLeadCard({
  lead,
  onLeadClick,
  onCall,
  onReschedule,
  onComplete,
  index = 0,
  isSwipeEnabled = true
}: OptimizedMobileLeadCardProps) {
  // Viewport optimization - only render expensive effects when in view
  const {
    elementRef,
    shouldRenderEffects,
    shouldAnimate,
    getOptimizedClassNames,
    getOptimizedStyles
  } = useViewportOptimization({
    threshold: [0, 0.1, 0.5],
    rootMargin: '50px',
    enableAnimations: true,
    enableGlassmorphism: true
  });

  // Swipe state with RAF optimization
  const [swipeState, setSwipeState] = React.useState({
    isOpen: false,
    offset: 0,
    isDragging: false
  });

  const touchStartRef = React.useRef({ x: 0, y: 0, time: 0 });
  const rafRef = React.useRef<number | null>(null);

  // Memoized calculations to prevent unnecessary re-renders
  const timeStatus = useMemo(() => {
    if (!lead.scheduledAppointmentTime) {
      return { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'No Time' };
    }

    const appointmentTime = lead.scheduledAppointmentTime.toDate();
    const now = new Date();
    const minutesUntil = differenceInMinutes(appointmentTime, now);
    const isOverdue = isPast(appointmentTime);

    if (isOverdue) return { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Overdue' };
    if (minutesUntil <= 15) return { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' };
    if (minutesUntil <= 60) return { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Soon' };
    
    return { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Scheduled' };
  }, [lead.scheduledAppointmentTime]);

  // Optimized touch handlers with RAF batching
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isSwipeEnabled) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now()
    };

    setSwipeState(prev => ({ ...prev, isDragging: true }));
  }, [isSwipeEnabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isDragging || !isSwipeEnabled) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Only handle horizontal swipes
    if (deltaY > 30) return;

    // Prevent scrolling during horizontal swipe
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }

    // Use RAF to batch updates for smooth 60fps
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const maxOffset = -120;
      const newOffset = Math.max(Math.min(deltaX, 0), maxOffset);
      
      setSwipeState(prev => ({
        ...prev,
        offset: newOffset,
        isOpen: newOffset < -60
      }));
    });
  }, [swipeState.isDragging, isSwipeEnabled]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwipeEnabled) return;

    const { offset } = swipeState;
    const shouldOpen = offset < -60;

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setSwipeState({
      isOpen: shouldOpen,
      offset: shouldOpen ? -120 : 0,
      isDragging: false
    });
  }, [swipeState, isSwipeEnabled]);

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Optimized click handler with haptic feedback
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (swipeState.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setSwipeState(prev => ({ ...prev, isOpen: false, offset: 0 }));
      return;
    }

    // Haptic feedback for iOS
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onLeadClick(lead);
  }, [swipeState.isOpen, onLeadClick, lead]);

  // Action handlers with haptic feedback
  const createActionHandler = useCallback((action: (lead: Lead) => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([20]);
    }

    action(lead);
    setSwipeState(prev => ({ ...prev, isOpen: false, offset: 0 }));
  }, [lead]);

  const handleCall = createActionHandler(onCall);
  const handleReschedule = createActionHandler(onReschedule);
  const handleComplete = createActionHandler(onComplete);

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn(
        // Base card styles
        'relative overflow-hidden mobile-lead-card ultra-responsive',
        // Viewport optimizations
        getOptimizedClassNames(),
        // Animation classes
        shouldAnimate && 'animate-list-enter',
        // Performance classes
        'transform-gpu hardware-accelerated'
      )}
      style={{
        ...getOptimizedStyles(),
        // Staggered animation delay
        animationDelay: shouldAnimate ? `${Math.min(index * 50, 300)}ms` : '0ms',
        // Swipe transform
        transform: `translateX(${swipeState.offset}px) translateZ(0)`,
        transition: swipeState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      {/* Main card content */}
      <div
        className={cn(
          'p-4 rounded-2xl border transition-all duration-200',
          // Conditional glassmorphism based on viewport
          shouldRenderEffects ? [
            'bg-white/8 backdrop-blur-xl border-white/10',
            'hover:bg-white/12 hover:border-white/20 hover:shadow-lg'
          ] : [
            'bg-white/5 border-white/5'
          ],
          // Status-based styling
          lead.setterVerified && 'border-green-400/30',
          timeStatus.color === 'text-orange-400' && 'border-orange-400/40',
          timeStatus.color === 'text-red-400' && 'border-red-400/40',
          // Active state
          'active:scale-[0.98] active:bg-white/6'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        {/* Status indicators */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", timeStatus.color.replace('text-', 'bg-'))} />
          {lead.setterVerified && (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
        </div>

        {/* Customer info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {lead.customerName}
            </h3>
            <p className="text-sm text-white/60 truncate">
              {lead.customerPhone}
            </p>
          </div>
        </div>

        {/* Appointment time */}
        {lead.scheduledAppointmentTime && (
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/80">
              {format(lead.scheduledAppointmentTime.toDate(), 'MMM d, h:mm a')}
            </span>
            <span className={cn("text-xs px-2 py-1 rounded-full", timeStatus.bg, timeStatus.color)}>
              {timeStatus.label}
            </span>
          </div>
        )}

        {/* Address */}
        {lead.address && (
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60 truncate">
              {lead.address}
            </span>
          </div>
        )}

        {/* Setter info */}
        {lead.setterName && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <User className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/60">
              Set by: {lead.setterName}
            </span>
          </div>
        )}
      </div>

      {/* Swipe actions */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 flex items-center gap-2 px-3 swipe-actions',
          'transition-opacity duration-300',
          swipeState.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          '--swipe-opacity': swipeState.isOpen ? '1' : '0'
        } as React.CSSProperties}
      >
        {/* Call action */}
        <button
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white p-0 border-0 ultra-responsive haptic-button shadow-lg shadow-green-500/25"
          onClick={handleCall}
        >
          <Phone className="w-5 h-5 mx-auto" />
        </button>

        {/* Update Lead action */}
        <button
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white p-0 border-0 ultra-responsive haptic-button shadow-lg shadow-blue-500/25"
          onClick={handleReschedule}
        >
          <RotateCcw className="w-5 h-5 mx-auto" />
        </button>

        {/* Complete action */}
        <button
          className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white p-0 border-0 ultra-responsive haptic-button shadow-lg shadow-purple-500/25"
          onClick={handleComplete}
        >
          <CheckCircle2 className="w-5 h-5 mx-auto" />
        </button>
      </div>
    </div>
  );
});

export default OptimizedMobileLeadCard;

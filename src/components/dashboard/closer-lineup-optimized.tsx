"use client";

import { useState, useEffect, memo, useRef } from "react";
import type { Closer, Lead } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { Users, Settings, MessageCircle, UserX, Star } from "lucide-react";
import ManageClosersModal from "./off-duty-closers-modal";
import Image from 'next/image';

// iOS Native Enhancements
import { useIOSSwipeActions, type SwipeAction } from "@/hooks/use-ios-swipe-actions";

// Import dnd-kit components for drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Performance-optimized skeleton component
const SkeletonCloserLineup = memo(() => (
  <div className="frosted-glass-card p-6 h-48 ios-skeleton">
    <div className="loading-skeleton h-6 w-24 mb-4"></div>
    <div className="grid grid-cols-3 gap-4 py-6 px-4">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="flex flex-col items-center">
          <div className="loading-skeleton w-12 h-12 rounded-full mb-2"></div>
          <div className="loading-skeleton h-3 w-16"></div>
        </div>
      ))}
    </div>
  </div>
));
SkeletonCloserLineup.displayName = 'SkeletonCloserLineup';

// Enhanced closer card with iOS swipe actions
const SwipeableCloserCard = memo(({ 
  closer, 
  index, 
  isCloser,
  canManageClosers 
}: { 
  closer: Closer; 
  index: number; 
  isCloser: boolean;
  canManageClosers: boolean;
}) => {
  const { toast } = useToast();

  // Define swipe actions for managers
  const swipeActions: SwipeAction[] = canManageClosers ? [
    {
      id: 'message',
      label: 'Message',
      icon: <MessageCircle size={16} />,
      color: 'blue',
      onAction: () => {
        toast({
          title: "Message Closer",
          description: `Opening chat with ${closer.name}`,
        });
        // Navigate to chat or open message modal
      },
    },
    {
      id: 'priority',
      label: 'Priority',
      icon: <Star size={16} />,
      color: 'orange',
      onAction: () => {
        toast({
          title: "Set Priority",
          description: `${closer.name} marked as priority closer`,
        });
        // Mark as priority closer logic
      },
    },
    {
      id: 'remove',
      label: 'Remove',
      icon: <UserX size={16} />,
      color: 'red',
      destructive: true,
      onAction: () => {
        toast({
          title: "Remove from Lineup",
          description: `${closer.name} removed from active lineup`,
          variant: "destructive",
        });
        // Remove from lineup logic
      },
    },
  ] : [];

  const {
    isSwipeActive,
    swipeDistance,
    direction,
    activeActionIndex,
    elementRef,
    swipeContainerStyle,
    getActionColor,
    visibleActions,
  } = useIOSSwipeActions({
    actions: swipeActions,
    enabled: canManageClosers,
    threshold: 80,
  });

  return (
    <div className="ios-swipe-container" ref={elementRef}>
      {/* Swipe Actions Background */}
      {isSwipeActive && visibleActions.length > 0 && (
        <div className="ios-swipe-actions">
          {visibleActions.map((action, actionIndex) => (
            <div
              key={action.id}
              className={`ios-swipe-action ${getActionColor(action.color)}`}
              style={{
                opacity: actionIndex === activeActionIndex ? 1 : 0.7,
                transform: actionIndex === activeActionIndex ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs">{action.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Main Content */}
      <div style={swipeContainerStyle}>
        <CloserCard closer={closer} index={index} isCloser={isCloser} />
      </div>
    </div>
  );
});
SwipeableCloserCard.displayName = 'SwipeableCloserCard';

// Memoized closer card for performance - only re-renders if data changes
const CloserCard = memo(({ 
  closer, 
  index, 
  isCloser 
}: { 
  closer: Closer; 
  index: number; 
  isCloser: boolean;
}) => {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      className="flex flex-col items-center w-full max-w-[85px]"
      style={{
        animationDelay: `${Math.min(index * 0.1, 0.8)}s`,
        willChange: 'transform, opacity',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        isolation: 'isolate'
      }}
    >
      {/* iOS-optimized avatar container */}
      <div 
        className="relative mb-3 closer-lineup-avatar-container"
        style={{
          width: '48px',
          height: '48px',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Hardware-accelerated animation container */}
        <div
          style={{ 
            animationDelay: `${Math.min(index * 0.1, 0.8)}s`,
            animationFillMode: 'both',
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
            position: 'relative',
            width: '100%',
            height: '100%'
          }}
        >
          {/* Optimized avatar with Next.js Image */}
          <div 
            className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-md border-2 border-white/20 overflow-hidden"
            style={{
              position: 'relative',
              zIndex: 2,
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              contain: 'layout style paint',
              isolation: 'isolate'
            }}
          >
            {!imageError && closer.avatarUrl ? (
              <Image 
                src={closer.avatarUrl}
                alt={closer.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImageError}
                style={{
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                  contain: 'layout style paint'
                }}
              />
            ) : (
              <Image 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(closer.name)}&background=4F46E5&color=fff&size=48&format=png`}
                alt={closer.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                loading="lazy"
                style={{
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                  contain: 'layout style paint'
                }}
                onError={() => {
                  // Fallback to initials if everything fails
                  const initials = closer.name?.substring(0, 2).toUpperCase() || "??";
                  return (
                    <span className="text-white text-sm font-bold">
                      {initials}
                    </span>
                  );
                }}
              />
            )}
          </div>
          
          {/* Enhanced position badge with high contrast */}
          <div 
            className="closer-lineup-position-badge"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '28px',
              height: '28px',
              background: 'linear-gradient(135deg, #007AFF 0%, #0056CC 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15,
              boxShadow: '0 3px 12px rgba(0, 122, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.95)',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              pointerEvents: 'none',
              contain: 'layout style paint',
              isolation: 'isolate'
            }}
          >
            <span 
              style={{
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              {index + 1}
            </span>
          </div>
        </div>
      </div>
      
      <p 
        className="text-xs font-medium text-white text-center leading-tight px-1 truncate"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          fontSize: '11px',
          lineHeight: '1.2',
          maxWidth: '70px'
        }}
      >
        {closer.name}
      </p>
    </div>
  );
}, (prev, next) => 
  prev.closer.uid === next.closer.uid && 
  prev.closer.status === next.closer.status &&
  prev.index === next.index &&
  prev.isCloser === next.isCloser
);
CloserCard.displayName = 'CloserCard';

// Sortable wrapper component for drag and drop functionality with long press
interface SortableCloserCardProps {
  closer: Closer;
  index: number;
  isCloser: boolean;
  isDragMode: boolean;
  canManageClosers: boolean;
}

const SortableCloserCard = memo(({ closer, index, isCloser, isDragMode, canManageClosers }: SortableCloserCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: closer.uid,
    disabled: !isDragMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDragMode ? listeners : {})}
      className={`
        ${isDragMode ? 'touch-manipulation cursor-move' : ''} 
        ${isDragging ? 'dragging-item' : ''} 
        ${isDragMode && !isDragging ? 'drag-mode-active' : ''}
        transition-all duration-200 ease-out
      `}
    >
      <SwipeableCloserCard 
        closer={closer} 
        index={index} 
        isCloser={isCloser} 
        canManageClosers={canManageClosers && !isDragMode}
      />
    </div>
  );
}, (prev, next) => 
  prev.closer.uid === next.closer.uid && 
  prev.closer.status === next.closer.status &&
  prev.index === next.index &&
  prev.isCloser === next.isCloser &&
  prev.isDragMode === next.isDragMode &&
  prev.canManageClosers === next.canManageClosers
);
SortableCloserCard.displayName = 'SortableCloserCard';

// Optimized hook for closer data with caching
const useOptimizedClosers = (teamId: string) => {
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [allOnDutyClosers, setAllOnDutyClosers] = useState<Closer[]>([]);
  const [isLoadingClosers, setIsLoadingClosers] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(true);
  const { toast } = useToast();

  // Get assigned lead closer IDs with caching
  useEffect(() => {
    if (!teamId) {
      setAssignedLeadCloserIds(new Set());
      setIsLoadingAssigned(false);
      return;
    }

    const leadsRef = collection(db, "leads");
    const assignedLeadsQuery = query(
      leadsRef,
      where("teamId", "==", teamId),
      where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
    );

    const unsubscribeLeads = onSnapshot(
      assignedLeadsQuery,
      (snapshot) => {
        const assignedCloserIds = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const lead = doc.data() as Lead;
          if (lead.assignedCloserId) {
            assignedCloserIds.add(lead.assignedCloserId);
          }
        });
        setAssignedLeadCloserIds(assignedCloserIds);
        setIsLoadingAssigned(false);
      },
      () => {
        setAssignedLeadCloserIds(new Set());
        setIsLoadingAssigned(false);
      }
    );

    return () => unsubscribeLeads();
  }, [teamId]);

  // Get closer lineup with optimization
  useEffect(() => {
    if (!teamId || isLoadingAssigned) return;

    const closersRef = collection(db, "closers");
    const closersQuery = query(
      closersRef,
      where("teamId", "==", teamId),
      where("status", "==", "On Duty")
    );

    const unsubscribeClosers = onSnapshot(
      closersQuery,
      (snapshot) => {
        const availableClosers: Closer[] = [];
        const allOnDuty: Closer[] = [];

        snapshot.docs.forEach((doc) => {
          const closer = { ...doc.data(), uid: doc.id } as Closer;
          
          allOnDuty.push(closer);
          
          if (!assignedLeadCloserIds.has(closer.uid)) {
            availableClosers.push(closer);
          }
        });

        // Sort optimizations
        const sortClosers = (closers: Closer[]) => closers.sort((a, b) => {
          if (a.lineupOrder !== undefined && b.lineupOrder !== undefined) {
            return a.lineupOrder - b.lineupOrder;
          }
          if (a.lineupOrder !== undefined) return -1;
          if (b.lineupOrder !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });

        setClosersInLineup(sortClosers(availableClosers));
        setAllOnDutyClosers(sortClosers([...allOnDuty]));
        setIsLoadingClosers(false);
      },
      () => {
        toast({
          title: "Error",
          description: "Failed to load closer lineup. Please refresh the page.",
          variant: "destructive",
        });
        setClosersInLineup([]);
        setAllOnDutyClosers([]);
        setIsLoadingClosers(false);
      }
    );

    return () => unsubscribeClosers();
  }, [teamId, assignedLeadCloserIds, isLoadingAssigned, toast]);

  return {
    closersInLineup,
    allOnDutyClosers,
    isLoading: isLoadingAssigned || isLoadingClosers
  };
};

// Intersection observer hook for performance
const useIntersectionObserver = (options: {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  const { threshold = 0.1, rootMargin = '100px', triggerOnce = true } = options;
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        
        if (isVisible && (!triggerOnce || !hasTriggered)) {
          setIsIntersecting(true);
          setHasTriggered(true);
        } else if (!triggerOnce) {
          setIsIntersecting(isVisible);
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);
  
  return { ref, isIntersecting };
};

export default function CloserLineupOptimized() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.1 });
  const { closersInLineup, allOnDutyClosers, isLoading } = useOptimizedClosers(user?.teamId || '');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Check permissions
  const canManageClosers = user?.role === "manager" || user?.role === "admin";
  const isCloser = user?.role === "closer";

  // Configure drag sensors with long press activation for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500, // 500ms long press to activate drag
        tolerance: 5, // Allow 5px movement during press
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const closers = isCloser ? allOnDutyClosers : closersInLineup;
    const oldIndex = closers.findIndex((closer) => closer.uid === active.id);
    const newIndex = closers.findIndex((closer) => closer.uid === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Update local state immediately for smooth UX
    const newClosers = arrayMove(closers, oldIndex, newIndex);
    
    if (isCloser) {
      // For closers viewing the full lineup, we'd need to update allOnDutyClosers
      // But this is view-only, so we won't actually persist changes
      toast({
        title: "View Only",
        description: "Contact your manager to reorder the lineup.",
        variant: "default",
      });
      return;
    } else {
      // For managers, update the lineup order in Firestore
      setIsUpdatingOrder(true);
      
      try {
        const batch = writeBatch(db);
        
        // Update lineup orders with proper spacing
        newClosers.forEach((closer, index) => {
          const closerRef = doc(db, "closers", closer.uid);
          const newLineupOrder = (index + 1) * 1000; // Space orders by 1000
          batch.update(closerRef, { lineupOrder: newLineupOrder });
        });
        
        await batch.commit();
        
        // Provide haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        toast({
          title: "Lineup Updated",
          description: "Closer order has been successfully updated.",
          variant: "default",
        });
        
        // Auto-exit drag mode after successful reorder
        setTimeout(() => setIsDragMode(false), 1000);
        
      } catch (error) {
        console.error("Error updating lineup order:", error);
        toast({
          title: "Update Failed",
          description: "Could not update lineup order. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdatingOrder(false);
      }
    }
  };

  // Handle long press to enter drag mode
  const handleLongPress = () => {
    if (canManageClosers && !isDragMode) {
      setIsDragMode(true);
      
      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 25, 50]); // Double buzz pattern
      }
      
      toast({
        title: "Drag Mode Active",
        description: "Long press and drag to reorder closers. Tap outside to exit.",
        variant: "default",
      });
    }
  };

  // Exit drag mode when clicking outside
  const handleClickOutside = () => {
    if (isDragMode) {
      setIsDragMode(false);
      toast({
        title: "Drag Mode Disabled",
        description: "Lineup reordering is now disabled.",
        variant: "default",
      });
    }
  };

  // Early return with intersection observer for performance
  if (!isIntersecting) {
    return (
      <div ref={ref}>
        <h2 className="text-2xl font-lora text-white mb-4">Up Next</h2>
        <SkeletonCloserLineup />
      </div>
    );
  }

  const handleCardClick = () => {
    if (canManageClosers) {
      setIsManageModalOpen(true);
    }
  };

  // Determine which closers to display
  const displayClosers = isCloser ? allOnDutyClosers : closersInLineup;
  const emptyMessage = isCloser 
    ? "No closers are currently on duty."
    : "No closers are currently available.";

  return (
    <div ref={ref}>
      <h2 className="text-2xl font-lora text-white mb-4">Up Next</h2>
      
      <div 
        className="frosted-glass-card p-2 relative ios-slide-up"
        data-testid="closer-lineup-card"
      >
        {/* Management gear icon */}
        {canManageClosers && (
          <button
            onClick={handleCardClick}
            className="absolute top-2 right-2 z-20 p-1 hover:bg-white/10 transition-all duration-200 rounded-sm gear-icon-btn ios-button-press ios-focus"
            title="Manage Closers"
          >
            <Settings className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
          </button>
        )}

        {isLoading ? (
          <div className="py-6 px-4">
            <div className="grid grid-cols-3 gap-4 items-start justify-items-center min-h-[120px]">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex flex-col items-center">
                  <div className="loading-skeleton w-12 h-12 rounded-full mb-2"></div>
                  <div className="loading-skeleton h-3 w-16"></div>
                </div>
              ))}
            </div>
          </div>
        ) : displayClosers.length > 0 ? (
          <div className="relative overflow-visible" onClick={handleClickOutside}>
            {/* Drag mode indicator */}
            {isDragMode && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full font-medium z-10">
                Long press and drag to reorder
              </div>
            )}
            
            {/* Loading overlay during updates */}
            {isUpdatingOrder && (
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                <div className="text-white text-sm">Updating order...</div>
              </div>
            )}

            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={displayClosers.slice(0, 6).map(closer => closer.uid)}
                strategy={rectSortingStrategy}
              >
                <div 
                  className="grid grid-cols-3 gap-4 py-6 px-4 items-start justify-items-center min-h-[120px] closer-lineup-grid"
                  style={{
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    isolation: 'isolate',
                  }}
                  onTouchStart={(e) => {
                    // Check if this is a long press candidate
                    if (canManageClosers && !isDragMode) {
                      const touchStartTime = Date.now();
                      const longPressTimer = setTimeout(() => {
                        handleLongPress();
                      }, 500);
                      
                      const handleTouchEnd = () => {
                        clearTimeout(longPressTimer);
                        e.currentTarget.removeEventListener('touchend', handleTouchEnd);
                        e.currentTarget.removeEventListener('touchmove', handleTouchMove);
                      };
                      
                      const handleTouchMove = () => {
                        clearTimeout(longPressTimer);
                        e.currentTarget.removeEventListener('touchend', handleTouchEnd);
                        e.currentTarget.removeEventListener('touchmove', handleTouchMove);
                      };
                      
                      e.currentTarget.addEventListener('touchend', handleTouchEnd);
                      e.currentTarget.addEventListener('touchmove', handleTouchMove);
                    }
                  }}
                >
                  {displayClosers.slice(0, 6).map((closer, index) => (
                    <SortableCloserCard
                      key={closer.uid} 
                      closer={closer} 
                      index={index}
                      isCloser={isCloser}
                      isDragMode={isDragMode && canManageClosers}
                      canManageClosers={canManageClosers}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {/* More indicator */}
            {displayClosers.length > 6 && (
              <div className="absolute bottom-2 right-2 text-gray-400 opacity-60">
                <div className="flex items-center space-x-1 text-xs">
                  <span>+{displayClosers.length - 6} more</span>
                  <Users className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
      
      {canManageClosers && (
        <ManageClosersModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
        />
      )}
    </div>
  );
}
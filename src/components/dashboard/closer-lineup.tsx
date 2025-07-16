"use client";

import {useState, useEffect} from "react";
import Image from "next/image";
import type {Closer, UserRole, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, doc, writeBatch} from "firebase/firestore";
import CloserCard from "./closer-card";
import { Users, Settings } from "lucide-react";
import ManageClosersModal from "./off-duty-closers-modal";
import { SkeletonCloserLineup } from "@/components/ui/skeleton-loader";
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
import {CSS} from '@dnd-kit/utilities';

// SortableItem component for drag and drop
interface SortableItemProps {
  id: string;
  closer: Closer;
  index: number;
  isReorderMode: boolean;
}

function SortableItem({ id, closer, index, isReorderMode }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
      {...(isReorderMode ? listeners : {})}
      className={`flex flex-col items-center w-full max-w-[100px] ${
        isReorderMode ? 'cursor-move' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div 
        className={`relative mb-3 closer-lineup-avatar-container ${
          isReorderMode ? 'jiggle-animation' : ''
        }`}
        style={{
          width: '64px',
          height: '64px',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1
        }}
      >
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
          <div 
            className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-md border-2 border-white/20"
            style={{
              overflow: 'hidden',
              position: 'relative',
              zIndex: 2,
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              contain: 'layout style paint',
              isolation: 'isolate'
            }}
          >
            {closer.avatarUrl ? (
              <Image 
                src={closer.avatarUrl}
                alt={closer.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                style={{
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                  contain: 'layout style paint'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(closer.name)}&background=4F46E5&color=fff&size=48&format=png`;
                }}
              />
            ) : (
              <Image 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(closer.name)}&background=4F46E5&color=fff&size=64&format=png`}
                alt={closer.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                style={{
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'none',
                  display: 'block',
                  contain: 'layout style paint'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="text-white text-sm font-bold" style="pointer-events: none; user-select: none; -webkit-user-select: none;">${closer.name?.substring(0, 2).toUpperCase() || "??"}</span>`;
                  }
                }}
              />
            )}
          </div>
          
          <div 
            className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/80"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              zIndex: 15,
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              pointerEvents: 'none',
              contain: 'layout style paint',
              isolation: 'isolate'
            }}
          >
            <span 
              className="text-xs font-bold text-white"
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
                fontSize: '12px',
                fontWeight: '700',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
              }}
            >
              {index + 1}
            </span>
          </div>
        </div>
      </div>
      <p 
        className="text-xs font-medium text-[var(--text-primary)] text-center leading-tight px-1"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          fontSize: '11px',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '90px'
        }}
      >
        {closer.name}
      </p>
    </div>
  );
}

export default function CloserLineup() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [allOnDutyClosers, setAllOnDutyClosers] = useState<Closer[]>([]);
  const [isLoadingClosersForLineup, setIsLoadingClosersForLineup] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedCloserIds, setIsLoadingAssignedCloserIds] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Check if user can manage closers (managers and admins)
  const canManageClosers = user?.role === "manager" || user?.role === "admin";
  
  // Check if user is a closer (show full lineup)
  const isCloser = user?.role === "closer";

  // Drag and drop sensors - fixed configuration to avoid hook violations
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Fixed distance for activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('🔄 Drag end event:', { activeId: active.id, overId: over?.id, isReorderMode });

    if (!over || active.id === over.id) {
      console.log('❌ No drop target or same position');
      return;
    }

    if (!isReorderMode) {
      console.log('❌ Not in reorder mode');
      return;
    }

    const closers = isCloser ? allOnDutyClosers : closersInLineup;
    const oldIndex = closers.findIndex((closer) => closer.uid === active.id);
    const newIndex = closers.findIndex((closer) => closer.uid === over.id);

    console.log('📍 Drag indices:', { oldIndex, newIndex, totalClosers: closers.length });

    if (oldIndex === -1 || newIndex === -1) {
      console.log('❌ Invalid indices');
      return;
    }

    const newClosers = arrayMove(closers, oldIndex, newIndex);

    // Update local state immediately for smooth UX
    if (isCloser) {
      setAllOnDutyClosers(newClosers);
    } else {
      setClosersInLineup(newClosers);
    }

    console.log('✅ Local state updated, updating Firestore...');

    // Update lineup orders in Firestore
    await updateLineupOrder(newClosers);
  };

  // Update lineup order in Firestore
  const updateLineupOrder = async (reorderedClosers: Closer[]) => {
    setIsUpdatingOrder(true);
    try {
      const batch = writeBatch(db);

      reorderedClosers.forEach((closer, index) => {
        const closerRef = doc(db, "closers", closer.uid);
        const newLineupOrder = (index + 1) * 1000; // Ensure proper spacing
        batch.update(closerRef, { lineupOrder: newLineupOrder });
      });

      await batch.commit();
      toast({
        title: "Lineup Updated",
        description: "Closer lineup order has been updated successfully.",
      });
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
  };

  // Handle gear click - toggle reorder mode
  const handleGearClick = () => {
    console.log('🔧 Gear clicked, current reorder mode:', isReorderMode);
    if (isReorderMode) {
      setIsReorderMode(false);
      console.log('❌ Exited reorder mode');
    } else {
      setIsReorderMode(true);
      console.log('✅ Entered reorder mode');
    }
  };
  
  // Get assigned lead closer IDs
  useEffect(() => {
    if (!user?.teamId) {
      setAssignedLeadCloserIds(new Set());
      setIsLoadingAssignedCloserIds(false);
      return;
    }

    // Query for leads with assigned closers to exclude them from the lineup
    const leadsRef = collection(db, "leads");
    const assignedLeadsQuery = query(
      leadsRef,
      where("teamId", "==", user.teamId),
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
        setIsLoadingAssignedCloserIds(false);
      },
      (_error) => {
        toast({
          title: "Error",
          description: "Failed to load assigned leads. Please refresh the page.",
          variant: "destructive",
        });
        setAssignedLeadCloserIds(new Set());
        setIsLoadingAssignedCloserIds(false);
      }
    );

    return () => unsubscribeLeads();
  }, [user?.teamId, toast]);

  // Get closer lineup
  useEffect(() => {
    if (!user?.teamId || isLoadingAssignedCloserIds) return;

    const closersRef = collection(db, "closers");
    const closersQuery = query(
      closersRef,
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty")
    );

    const unsubscribeClosers = onSnapshot(
      closersQuery,
      (snapshot) => {
        const availableClosers: Closer[] = [];
        const allOnDuty: Closer[] = [];

        snapshot.docs.forEach((doc) => {
          const closer = { ...doc.data(), uid: doc.id } as Closer;
          
          // All on duty closers
          allOnDuty.push(closer);
          
          // Only closers not already assigned to a lead
          if (!assignedLeadCloserIds.has(closer.uid)) {
            availableClosers.push(closer);
          }
        });

        // Sort by lineup order or name as fallback
        const sortedAvailableClosers = availableClosers.sort((a, b) => {
          // If both have lineup order, use that
          if (a.lineupOrder !== undefined && b.lineupOrder !== undefined) {
            return a.lineupOrder - b.lineupOrder;
          }
          // If only one has lineup order, prioritize that one
          if (a.lineupOrder !== undefined) return -1;
          if (b.lineupOrder !== undefined) return 1;
          // Fallback to name sort
          return a.name.localeCompare(b.name);
        });
        
        // Sort all on duty closers by lineup order or name as fallback
        const sortedAllOnDutyClosers = allOnDuty.sort((a, b) => {
          // If both have lineup order, use that
          if (a.lineupOrder !== undefined && b.lineupOrder !== undefined) {
            return a.lineupOrder - b.lineupOrder;
          }
          // If only one has lineup order, prioritize that one
          if (a.lineupOrder !== undefined) return -1;
          if (b.lineupOrder !== undefined) return 1;
          // Fallback to name sort
          return a.name.localeCompare(b.name);
        });

        setClosersInLineup(sortedAvailableClosers);
        setAllOnDutyClosers(sortedAllOnDutyClosers);
        setIsLoadingClosersForLineup(false);
      },
      (_error) => {
        toast({
          title: "Error",
          description: "Failed to load closer lineup. Please refresh the page.",
          variant: "destructive",
        });
        setClosersInLineup([]);
        setAllOnDutyClosers([]);
        setIsLoadingClosersForLineup(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, assignedLeadCloserIds, isLoadingAssignedCloserIds, toast]);

  const isOverallLoading = isLoadingAssignedCloserIds || isLoadingClosersForLineup;

  const handleCardClick = () => {
    console.log('🔥 CloserLineup - Card header clicked for manager tools:', { 
      userRole: user?.role, 
      canManageClosers,
      modalWillOpen: canManageClosers && !isReorderMode 
    });
    if (canManageClosers && !isReorderMode) {
      setIsManageModalOpen(true);
    }
  };

  // Determine which closers to display and the appropriate messaging
  const getDisplayData = () => {
    // Safety check for user data
    if (!user || !user.role) {
      return {
        closers: [],
        emptyTitle: "Loading...",
        emptyDescription: "Please wait while we load your data.",
        titleSuffix: 'Loading'
      };
    }

    if (isCloser) {
      // Closers see the full On Duty lineup with their position
      const displayClosers = allOnDutyClosers;
      const emptyTitle = "No On Duty Closers";
      const emptyDescription = "No closers are currently on duty.";
      const titleSuffix = 'On Duty';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix
      };
    } else {
      // Managers see the available lineup (not assigned to leads)
      const displayClosers = closersInLineup;
      const emptyTitle = "No Available Closers";
      const emptyDescription = "All closers are currently handling leads or off duty.";
      const titleSuffix = 'Available';
      
      return {
        closers: displayClosers,
        emptyTitle,
        emptyDescription,
        titleSuffix
      };
    }
  };

  // Get display data
  const { closers } = getDisplayData();
  
  return (
    <>
      <h2 className="text-2xl font-lora text-[var(--text-primary)] mb-4">Up Next</h2>
      <div 
        className="frosted-glass-card p-2 relative ios-slide-up"
        data-testid="closer-lineup-card"
      >
        {/* Gear Icon for Management and Reordering */}
        {canManageClosers && (
          <button
            onClick={isReorderMode ? handleGearClick : handleCardClick}
            className={`absolute top-2 right-2 z-20 p-1 transition-all duration-200 rounded-sm gear-icon-btn ios-button-press ios-focus ${
              isReorderMode 
                ? 'gear-icon-reorder-mode' 
                : 'hover:bg-white/10'
            }`}
            title={isReorderMode ? "Stop Reordering" : "Manage Closers"}
          >
            <Settings className={`w-4 h-4 opacity-70 hover:opacity-100 transition-all duration-200 ${
              isReorderMode 
                ? 'text-blue-400' 
                : 'text-[var(--text-primary)]'
            }`} />
          </button>
        )}

        {/* Additional Reorder Button when not in reorder mode */}
        {canManageClosers && !isReorderMode && (
          <button
            onClick={handleGearClick}
            className="absolute top-2 right-10 z-20 p-1 hover:bg-white/10 transition-all duration-200 rounded-sm gear-icon-btn ios-button-press ios-focus"
            title="Reorder Lineup"
          >
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-[var(--text-primary)] opacity-50 rounded-full"></div>
              <div className="w-1 h-1 bg-[var(--text-primary)] opacity-50 rounded-full"></div>
              <div className="w-1 h-1 bg-[var(--text-primary)] opacity-50 rounded-full"></div>
            </div>
          </button>
        )}

        {isLoadingClosersForLineup || isLoadingAssignedCloserIds ? (
          <SkeletonCloserLineup />
        ) : closers.length > 0 ? (
          <div className="relative overflow-visible">
            {/* Reorder Mode Indicator */}
            {isReorderMode && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full font-medium z-10">
                Drag to reorder
              </div>
            )}
            
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={closers.map(closer => closer.uid)}
                strategy={rectSortingStrategy}
              >
                <div 
                  className="grid grid-cols-3 gap-6 py-8 px-4 items-start justify-items-center min-h-[160px]"
                  style={{
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    isolation: 'isolate',
                  }}
                >
                  {closers.slice(0, 6).map((closer, index) => (
                    <SortableItem
                      key={closer.uid}
                      id={closer.uid}
                      closer={closer}
                      index={index}
                      isReorderMode={isReorderMode}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {/* More indicator - shows when there are more than 6 closers */}
            {closers.length > 6 && (
              <div className="absolute bottom-2 right-2 text-[var(--text-secondary)] opacity-60">
                <div className="flex items-center space-x-1 text-xs">
                  <span>+{closers.length - 6} more</span>
                  <Users className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-[var(--text-secondary)] py-8">
            <p>No closers are currently available.</p>
          </div>
        )}
      </div>
      
      {canManageClosers && (
        <ManageClosersModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
        />
      )}
    </>
  );
}

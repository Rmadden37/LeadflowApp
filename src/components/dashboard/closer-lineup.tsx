"use client";

import {useState, useEffect} from "react";
import Image from "next/image";
import type {Closer, UserRole, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy} from "firebase/firestore";
import CloserCard from "./closer-card";
import { Users, Settings } from "lucide-react";
import ManageClosersModal from "./off-duty-closers-modal";
import { SkeletonCloserLineup } from "@/components/ui/skeleton-loader";

export default function CloserLineup() {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closersInLineup, setClosersInLineup] = useState<Closer[]>([]);
  const [allOnDutyClosers, setAllOnDutyClosers] = useState<Closer[]>([]);
  const [isLoadingClosersForLineup, setIsLoadingClosersForLineup] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedCloserIds, setIsLoadingAssignedCloserIds] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Check if user can manage closers (managers and admins)
  const canManageClosers = user?.role === "manager" || user?.role === "admin";
  
  // Check if user is a closer (show full lineup)
  const isCloser = user?.role === "closer";
  
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
        
        // Sort all on duty closers alphabetically
        const sortedAllOnDutyClosers = allOnDuty.sort((a, b) => {
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
      modalWillOpen: canManageClosers 
    });
    if (canManageClosers) {
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
        {/* Gear Icon for Management */}
        {canManageClosers && (
          <button
            onClick={handleCardClick}
            className="absolute top-2 right-2 z-20 p-1 hover:bg-white/10 transition-all duration-200 rounded-sm gear-icon-btn ios-button-press ios-focus"
            title="Manage Closers"
          >
            <Settings className="w-4 h-4 text-[var(--text-primary)] opacity-70 hover:opacity-100" />
          </button>
        )}

        {isLoadingClosersForLineup || isLoadingAssignedCloserIds ? (
          <SkeletonCloserLineup />
        ) : closers.length > 0 ? (
          <div className="relative overflow-visible">
            {/* AURELIAN'S iOS-OPTIMIZED CLOSER LINEUP GRID */}
            <div 
              className="grid grid-cols-3 gap-6 py-8 px-4 items-start justify-items-center min-h-[160px]"
              style={{
                // iOS Safari PWA optimization
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                isolation: 'isolate', // Create new stacking context
              }}
            >
              {closers.slice(0, 6).map((closer, index) => (
                <div 
                  key={closer.uid} 
                  className="flex flex-col items-center w-full max-w-[100px]"
                  style={{
                    // Prevent iOS Safari from adding video controls
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    isolation: 'isolate'
                  }}
                >
                  {/* AURELIAN'S iOS-SAFE AVATAR CONTAINER */}
                  <div 
                    className="relative mb-3 closer-lineup-avatar-container"
                    style={{
                      width: '64px',
                      height: '64px',
                      isolation: 'isolate', // Create new stacking context for iOS
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {/* Hardware-accelerated animation container */}
                    <div
                      style={{ 
                        animationDelay: `${Math.min(index * 0.1, 0.8)}s`,
                        animationFillMode: 'both',
                        transform: 'translateZ(0)', // Hardware acceleration
                        willChange: 'transform, opacity',
                        position: 'relative',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      {/* iOS-optimized avatar with proper containment */}
                      <div 
                        className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-md border-2 border-white/20"
                        style={{
                          overflow: 'hidden',
                          position: 'relative',
                          zIndex: 2,
                          // Prevent iOS from treating as video
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
                              // iOS Safari PWA image optimization
                              WebkitUserSelect: 'none',
                              WebkitTouchCallout: 'none',
                              pointerEvents: 'none', // Prevent interaction
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
                      
                      {/* iOS-optimized position badge with enhanced contrast */}
                      <div 
                        className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/80"
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          zIndex: 15, // Higher than avatar to ensure visibility
                          // Prevent iOS Safari from adding controls
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
              ))}
            </div>
            
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

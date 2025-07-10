"use client";

import {useState, useEffect} from "react";
import type {Closer, UserRole, Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy} from "firebase/firestore";
import CloserCard from "./closer-card";
import { Users, Loader2, Settings } from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import ManageClosersModal from "./off-duty-closers-modal";
import Image from "next/image";

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
        className="frosted-glass-card p-3 relative ios-slide-up"
        data-testid="closer-lineup-card"
      >
        {/* Gear Icon for Management */}
        {canManageClosers && (
          <button
            onClick={handleCardClick}
            className="absolute top-3 right-3 z-20 p-1 hover:bg-white/10 transition-all duration-200 rounded-sm gear-icon-btn ios-button-press ios-focus"
            title="Manage Closers"
          >
            <Settings className="w-4 h-4 text-[var(--text-primary)] opacity-70 hover:opacity-100" />
          </button>
        )}

        {isLoadingClosersForLineup || isLoadingAssignedCloserIds ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : closers.length > 0 ? (
          <div className="relative overflow-hidden">
            <ScrollArea className="w-full h-32 closer-lineup-scroll">
              <div className="flex gap-6 py-6 px-8 w-max min-w-full items-center"
                   style={{ 
                     blockSize: 'fit-content',
                     maxBlockSize: '100px' 
                   }}>
                {closers.map((closer, index) => (
                  <div key={closer.uid} className="flex flex-col items-center flex-shrink-0">
                    <div className="relative mb-2 closer-lineup-avatar-container">
                      {/* Hardware-accelerated animation using CSS transforms */}
                      <div
                        className="relative animate-fadeInUp"
                        style={{ 
                          animationDelay: `${Math.min(index * 0.1, 0.8)}s`,
                          animationFillMode: 'both',
                          transform: 'translateZ(0)', // Hardware acceleration
                          willChange: 'transform, opacity'
                        }}
                      >
                        <Image
                          src={closer.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${closer.name}`}
                          alt={closer.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full shadow-md object-cover"
                          title={closer.name}
                        />
                        <div className="closer-lineup-bubble w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-200">
                          <span className="text-sm font-bold text-black">{index + 1}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] text-center whitespace-nowrap">
                      {closer.name}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Scroll Indicator - only show if there are more than 3 closers */}
            {closers.length > 3 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] opacity-50 pointer-events-none">
                <div className="flex flex-col items-center text-xs">
                  <span>→</span>
                  <span className="text-[10px]">{closers.length}</span>
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

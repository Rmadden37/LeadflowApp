"use client";

import {useState, useEffect} from "react";
import type {Lead, Closer, LeadStatus} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {useRouter} from "next/navigation";
import {db, acceptJobFunction} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp, getDoc} from "firebase/firestore";
import LeadCard from "./lead-card";
import CloserCard from "./closer-card";
import LeadDetailsDialog from "./lead-details-dialog";
import { Loader2, Ghost } from "lucide-react";
import Image from "next/image";

// Special visibility permissions configuration
// This allows certain closers to see other closers' leads
const SPECIAL_VISIBILITY_PERMISSIONS: Record<string, string[]> = {
  // Add specific user UIDs and the closer UIDs they can see leads for
  // This will be populated based on the actual UIDs from the database
};

// Helper function to check if a user has special lead visibility permissions
function checkSpecialLeadVisibilityPermissions(userUid: string): boolean {
  return userUid in SPECIAL_VISIBILITY_PERMISSIONS;
}

// Helper function to get the list of closer IDs that a user can see leads for
function getAllowedCloserIds(userUid: string): string[] {
  return SPECIAL_VISIBILITY_PERMISSIONS[userUid] || [];
}

// Helper function to add special permissions (can be called from debug tools)
function addSpecialVisibilityPermission(supervisorUid: string, targetCloserUid: string) {
  if (!SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid]) {
    SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid] = [];
  }
  if (!SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid].includes(targetCloserUid)) {
    SPECIAL_VISIBILITY_PERMISSIONS[supervisorUid].push(targetCloserUid);
  }
  console.log(`Added special permission: ${supervisorUid} can now see leads for ${targetCloserUid}`);
}

// Make the function available globally for debugging
interface WindowWithDebugFunctions extends Window {
  addSpecialVisibilityPermission?: typeof addSpecialVisibilityPermission;
}

if (typeof window !== 'undefined') {
  (window as WindowWithDebugFunctions).addSpecialVisibilityPermission = addSpecialVisibilityPermission;
}

interface InProcessDisplayItem {
  lead: Lead;
  closer?: Closer;
}

export default function InProcessLeads() {
  const {user} = useAuth();
  const {toast} = useToast();
  const router = useRouter();
  const [displayItems, setDisplayItems] = useState<InProcessDisplayItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [allTeamClosers, setAllTeamClosers] = useState<Closer[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingClosers(false);
      setAllTeamClosers([]);
      return;
    }
    setLoadingClosers(true);
    const closersQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId)
    );
    const unsubscribeClosers = onSnapshot(closersQuery, (snapshot) => {
      const closersData = snapshot.docs.map((doc) => ({uid: doc.id, ...doc.data()} as Closer));
      console.log("Team closers loaded:", closersData.length, "closers");
      closersData.forEach(closer => {
        console.log("Closer:", { uid: closer.uid, name: closer.name, teamId: closer.teamId });
      });
      setAllTeamClosers(closersData);
      setLoadingClosers(false);
    }, (error) => {
      console.error("Error loading team closers:", error);
      toast({
        title: "Error",
        description: `Failed to load team closers: ${error.message || 'Unknown error'}. Please refresh the page.`,
        variant: "destructive",
      });
      setLoadingClosers(false);
    });
    return () => unsubscribeClosers();
  }, [user, toast]);

  useEffect(() => {
    if (!user || !user.teamId || loadingClosers) {
      if (!user || !user.teamId) setLoadingLeads(false);
      if (loadingClosers) setDisplayItems([]);
      return;
    }
    setLoadingLeads(true);

    // Use the simplest possible query to avoid index issues
    const q = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      orderBy("createdAt", "desc"),
      limit(100) // Get more results to filter from
    );

    const unsubscribeLeads = onSnapshot(q, (querySnapshot) => {
      console.log("Raw leads query results:", querySnapshot.docs.length, "documents");
      console.log("Current user:", { uid: user.uid, role: user.role, teamId: user.teamId });
      
      // Log all leads for debugging
      querySnapshot.docs.forEach(doc => {
        const lead = doc.data() as Lead;
        console.log("Lead found:", {
          id: doc.id,
          customerName: lead.customerName,
          assignedCloserId: lead.assignedCloserId,
          status: lead.status,
          teamId: lead.teamId
        });
      });
      
      // Filter all results in memory based on user role and requirements
      let filteredDocs = querySnapshot.docs.filter(doc => {
        const lead = doc.data() as Lead;
        
        if (user.role === "closer") {
          // Check if this user has special permissions to see other users' leads
          const hasSpecialPermissions = checkSpecialLeadVisibilityPermissions(user.uid);
          
          if (hasSpecialPermissions) {
            // Users with special permissions can see leads assigned to specific other users
            const allowedCloserIds = getAllowedCloserIds(user.uid);
            const canSeeThisLead = (lead.assignedCloserId === user.uid || 
                                   allowedCloserIds.includes(lead.assignedCloserId || "")) &&
                                  ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
            console.log(`Special permissions filter for lead ${doc.id}:`, { 
              assignedCloserId: lead.assignedCloserId, 
              userUid: user.uid, 
              status: lead.status, 
              allowedCloserIds,
              canSeeThisLead 
            });
            return canSeeThisLead;
          } else {
            // For regular closers, only show leads assigned to them with specific statuses
            const isMatch = lead.assignedCloserId === user.uid && 
                   ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
            console.log(`Closer filter for lead ${doc.id}:`, { 
              assignedCloserId: lead.assignedCloserId, 
              userUid: user.uid, 
              status: lead.status, 
              isMatch 
            });
            return isMatch;
          }
        } else if (user.role === "setter") {
          // For setters, show ALL "in_process" leads for their team (regardless of assignment)
          // This ensures setters can see all leads that are actively being worked on by any closer in their team
          const isMatch = lead.status === "in_process";
          console.log(`Setter filter for lead ${doc.id}:`, { 
            assignedCloserId: lead.assignedCloserId, 
            status: lead.status, 
            setterId: lead.setterId,
            userUid: user.uid,
            isMatch 
          });
          return isMatch;
        } else if (user.role === "manager" || user.role === "admin") {
          // For managers/admins, only show leads that have an assigned closer and are in active statuses
          const isMatch = lead.assignedCloserId && 
                 ["waiting_assignment", "accepted", "in_process"].includes(lead.status);
          console.log(`Manager filter for lead ${doc.id}:`, { 
            assignedCloserId: lead.assignedCloserId, 
            status: lead.status, 
            isMatch 
          });
          return isMatch;
        }
        
        return false;
      });
      
      // Limit results after filtering
      const maxResults = (user.role === "manager" || user.role === "admin") ? 20 : 
                         (user.role === "setter") ? 15 : 10;
      filteredDocs = filteredDocs.slice(0, maxResults);
      
      console.log("Filtered leads:", filteredDocs.length, "matches");
      
      const newDisplayItems = filteredDocs.map((doc) => {
        const lead = {id: doc.id, ...doc.data()} as Lead;
        const assignedCloser = allTeamClosers.find((c) => c.uid === lead.assignedCloserId);
        console.log(`Lead ${doc.id} assigned closer:`, assignedCloser ? { uid: assignedCloser.uid, name: assignedCloser.name } : "not found");
        return {lead, closer: assignedCloser};
      });
      
      console.log("Final display items:", newDisplayItems.length);
      setDisplayItems(newDisplayItems);
      setLoadingLeads(false);
    }, (error) => {
      console.error("Error loading in-process leads:", error);
      toast({
        title: "Error",
        description: `Failed to load in-process leads: ${error.message || 'Unknown error'}. Please refresh the page.`,
        variant: "destructive",
      });
      setDisplayItems([]);
      setLoadingLeads(false);
    });

    return () => unsubscribeLeads();
  }, [user, allTeamClosers, loadingClosers, toast]);

  // Effect to set up special visibility permissions for specific users
  useEffect(() => {
    if (!user?.teamId || allTeamClosers.length === 0) return;
    
    // Look for Richard Niger and Marcelo Guerra in the team closers
    const richardNiger = allTeamClosers.find(closer => 
      closer.name.toLowerCase().includes('richard') && closer.name.toLowerCase().includes('niger')
    );
    const marceloGuerra = allTeamClosers.find(closer => 
      closer.name.toLowerCase().includes('marcelo') && closer.name.toLowerCase().includes('guerra')
    );
    
    // Set up permissions for Marcelo Guerra to see Richard Niger's leads
    if (richardNiger && marceloGuerra) {
      console.log("Setting up special visibility permissions:", {
        marceloUid: marceloGuerra.uid,
        richardUid: richardNiger.uid
      });
      
      // Clear any existing permissions for Marcelo and set up new ones
      SPECIAL_VISIBILITY_PERMISSIONS[marceloGuerra.uid] = [richardNiger.uid];
      
      console.log("Special permissions configured:", SPECIAL_VISIBILITY_PERMISSIONS);
    } else {
      console.log("Richard Niger or Marcelo Guerra not found in team closers:", {
        richardFound: !!richardNiger,
        marceloFound: !!marceloGuerra,
        allClosers: allTeamClosers.map(c => c.name)
      });
    }
  }, [user?.teamId, allTeamClosers]);

  if (user?.role === "setter") {
    // Allow setters to view ALL in-process leads for their team
    // This gives them visibility into which leads are actively being worked on
  }

  const isLoading = loadingLeads || loadingClosers;

  // Debug information for special permissions
  const hasSpecialPermissions = user?.role === "closer" && checkSpecialLeadVisibilityPermissions(user.uid);
  const _allowedCloserIds = hasSpecialPermissions ? getAllowedCloserIds(user.uid) : [];

  // Function to handle lead click - simplified to match lead queue pattern
  const handleLeadClick = (lead: Lead) => {
    console.log('🔥 InProcessLeads - Lead clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      userRole: user?.role 
    });
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedLead(null);
    setIsModalOpen(false);
  };

  const handleDispositionChange = async (leadId: string, newStatus: LeadStatus) => {
    console.log('🔥 InProcessLeads - Disposition change triggered:', { 
      leadId, 
      newStatus, 
      userRole: user?.role,
      userUid: user?.uid 
    });

    if (!user || (user.role !== "closer" && user.role !== "manager" && user.role !== "admin")) {
      toast({
        title: "Access Denied",
        description: "Only closers and managers can update lead disposition.",
        variant: "destructive",
      });
      return;
    }

    try {
      const leadRef = doc(db, "leads", leadId);
      
      // Get current lead data to check status
      const leadSnap = await getDoc(leadRef);
      if (!leadSnap.exists()) {
        throw new Error("Lead not found");
      }
      
      const currentLead = leadSnap.data();
      
      // For managers/admins dispositioning leads that skip workflow steps, handle transitions properly
      if ((user.role === "manager" || user.role === "admin") && 
          (currentLead.status === "waiting_assignment" || currentLead.status === "scheduled" || currentLead.status === "accepted") && 
          ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        // Managers/admins can disposition directly from any status - first transition to in_process if needed
        if (currentLead.status !== "in_process") {
          await updateDoc(leadRef, {
            status: "in_process",
            updatedAt: serverTimestamp(),
          });
          
          // Small delay to ensure the status update is processed
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Handle closers dispositioning from accepted status
      else if (user.role === "closer" && 
               currentLead.status === "accepted" && 
               ["sold", "no_sale", "canceled", "rescheduled", "credit_fail"].includes(newStatus)) {
        
        // First update to in_process
        await updateDoc(leadRef, {
          status: "in_process",
          updatedAt: serverTimestamp(),
        });
        
        // Small delay to ensure the status update is processed
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Update to the final status  
      const updateData: { [key: string]: string | null | ReturnType<typeof serverTimestamp> } = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        dispositionUpdatedBy: user.uid,
        dispositionUpdatedAt: serverTimestamp(),
      };

      // If manager/admin is setting status to waiting_assignment (reassigning), clear the assignment
      if ((user.role === "manager" || user.role === "admin") && newStatus === "waiting_assignment") {
        updateData.assignedCloserId = null;
        updateData.assignedCloserName = null;
      }

      await updateDoc(leadRef, updateData);

      toast({
        title: "Disposition Updated",
        description: `Lead status updated to ${newStatus.replace("_", " ")}.`,
      });

      // Navigate to dashboard after successful disposition save
      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating lead disposition:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update lead disposition. Please try again.",
        variant: "destructive",
      });
    }
  };

  const _handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <>
        <h2 className="text-2xl font-lora text-[var(--text-primary)] mb-4">
          {user?.role === "admin" || user?.role === "manager" ? "Active Assignments" : "In Process Leads"}
        </h2>
        <div className="frosted-glass-card p-6 text-center">
          <Ghost className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {user?.role === "admin" || user?.role === "manager" ? "No Active Assignments" : "All Quiet"}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
            {user?.role === "admin" || user?.role === "manager" 
              ? "No leads are currently assigned to closers." 
              : "No leads are currently being processed."
            }
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-lora text-[var(--text-primary)] mb-4">
        {user?.role === "admin" || user?.role === "manager" ? "Active Assignments" : "In Process Leads"}
      </h2>
      <div className="space-y-3">
        {displayItems.map(({ lead, closer }) => {
          if (!closer) return null;
          
          // For admins and managers, show enhanced cards with job acceptance controls
          if (user?.role === "admin" || user?.role === "manager") {
            return (
              <div key={lead.id} className="frosted-glass-card">
                <CloserCard
                  closer={closer}
                  assignedLeadName={lead.customerName}
                  leadId={lead.id}
                  currentLeadStatus={lead.status}
                  allowInteractiveToggle={false}
                  showMoveControls={false}
                  onDispositionChange={(newStatus) => handleDispositionChange(lead.id, newStatus)}
                  onLeadClick={() => handleLeadClick(lead)}
                />
              </div>
            );
          }
          
          // For other roles, show the simple view
          return (
            <div 
              key={lead.id} 
              className="frosted-glass-card p-4 flex items-center space-x-4 cursor-pointer transition-all hover:bg-[rgba(255,255,255,0.05)]"
              onClick={() => handleLeadClick(lead)}
            >
              <Image 
                src={closer.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${closer.name}`}
                alt={closer.name} 
                width={64}
                height={64}
                className="w-16 h-16 rounded-full border-2 border-white/15 shadow-md object-cover" 
              />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{lead.customerName}</p>
                <p className="text-sm text-[var(--text-secondary)]">Assigned to {closer.name}</p>
              </div>
            </div>
          );
      })}
      
      <LeadDetailsDialog 
        lead={selectedLead} 
        isOpen={isModalOpen} 
        onClose={handleCloseDialog} 
        context="in-process"
      />
    </div>
    </>
  );
}
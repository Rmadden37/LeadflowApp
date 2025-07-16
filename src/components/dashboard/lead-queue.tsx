"use client";

import { useState, useEffect } from "react";
import type { Lead } from "@/types"; // Removed: Closer type - no longer needed
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp as FirestoreTimestamp, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import LeadCard from "./lead-card";
import ScheduledLeadsCalendar from "./scheduled-leads-calendar";
import VerifiedCheckbox from "./verified-checkbox";
import { ListChecks, CalendarClock, Loader2, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay } from "date-fns";
import LeadDetailsDialog from "./lead-details-dialog";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MIN_LEAD_AGE_MS = 2 * 60 * 1000; // Don't process leads that are less than 2 minutes old

type Tab = "waiting" | "scheduled";

function parseDateString(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;
  const recognizedFormatMatch = dateString.match(/(\w+\s\d{1,2},\s\d{4})\s(?:at)\s(\d{1,2}:\d{2}:\d{2}\s[AP]M)/i);
  if (recognizedFormatMatch) {
    const datePart = recognizedFormatMatch[1];
    const timePart = recognizedFormatMatch[2];
    date = new Date(`${datePart} ${timePart}`);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

export default function LeadQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [processedScheduledLeadIds, setProcessedScheduledLeadIds] = useState<Set<string>>(new Set());
  // Removed: availableClosers, loadingClosers, assignedLeadCloserIds state - no longer needed for client-side backup assignment
  const [activeTab, setActiveTab] = useState<"waiting" | "scheduled">("waiting");
  // Initialize with today's date at start of day for consistent filtering
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent filtering
    return today;
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleLeadClick = (lead: Lead) => {
    console.log('🔥 LeadQueue - Lead clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      context: activeTab === "waiting" ? "queue-waiting" : "queue-scheduled",
      userRole: user?.role 
    });
    setSelectedLead(lead);
  };

  const handleCloseDialog = () => {
    setSelectedLead(null);
  };

  // Fetch waiting leads
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }
    setLoadingWaiting(true);

    console.log('🔄 Setting up waiting leads listener for team:', user.teamId);

    const qWaiting = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
      console.log('📊 Waiting leads snapshot received:', querySnapshot.size, 'documents');
      
      const leadsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        let createdAtTimestamp: FirestoreTimestamp | null = null;

        if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === "string") {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) {
          createdAtTimestamp = data.createdAt;
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          setterVerified: data.setterVerified || false,
          verifiedAt: data.verifiedAt || null,
          verifiedBy: data.verifiedBy || null,
          photoUrls: data.photoUrls || [],
        } as Lead;
      });
      
      // Filter for truly unassigned leads
      const unassignedLeads = leadsData.filter(lead => {
        const isUnassigned = !lead.assignedCloserId;
        const isWaiting = lead.status === "waiting_assignment";
        
        console.log(`📋 Lead ${lead.customerName}:`, {
          id: lead.id,
          assignedCloserId: lead.assignedCloserId,
          status: lead.status,
          isUnassigned,
          isWaiting
        });
        
        return isUnassigned && isWaiting;
      });
      
      console.log('✅ Filtered unassigned waiting leads:', unassignedLeads.length);
      setWaitingLeads(unassignedLeads);
      setLoadingWaiting(false);
    }, (error) => {
      console.error('❌ Error loading waiting leads:', error);
      toast({
        title: "Error",
        description: "Failed to load waiting leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user, toast]);

  // Fetch scheduled leads
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingScheduled(false);
      setScheduledLeads([]);
      return;
    }
    setLoadingScheduled(true);

    const qScheduled = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["rescheduled", "scheduled", "needs_verification"]),
      orderBy("scheduledAppointmentTime", "asc")
    );

    const unsubscribeScheduled = onSnapshot(qScheduled, async (querySnapshot) => {
      const leadsData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        
        let createdAtTimestamp: FirestoreTimestamp | null = null;
        if (data.submissionTime) {
          if (data.submissionTime instanceof FirestoreTimestamp) {
            createdAtTimestamp = data.submissionTime;
          } else if (typeof data.submissionTime === "string") {
            const parsedDate = parseDateString(data.submissionTime);
            if (parsedDate) {
              createdAtTimestamp = FirestoreTimestamp.fromDate(parsedDate);
            }
          }
        } else if (data.createdAt instanceof FirestoreTimestamp) {
          createdAtTimestamp = data.createdAt;
        }

        return {
          id: docSnapshot.id,
          customerName: data.clientName || data.customerName || "Unknown Customer",
          customerPhone: data.phone || data.customerPhone || "N/A",
          address: data.address,
          status: data.status,
          teamId: data.teamId,
          dispatchType: data.type || data.dispatchType || "immediate",
          assignedCloserId: data.assignedCloserId || data.assignedCloser || null,
          assignedCloserName: data.assignedCloserName || null,
          createdAt: createdAtTimestamp,
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt : serverTimestamp(),
          dispositionNotes: data.dispositionNotes || "",
          scheduledAppointmentTime: data.scheduledAppointmentTime instanceof FirestoreTimestamp ? data.scheduledAppointmentTime : (data.scheduledTime instanceof FirestoreTimestamp ? data.scheduledTime : null),
          setterId: data.setterId || null,
          setterName: data.setterName || null,
          setterLocation: data.setterLocation || null,
          photoUrls: data.photoUrls || [],
          setterVerified: data.setterVerified || false,
          verifiedAt: data.verifiedAt || null,
          verifiedBy: data.verifiedBy || null,
        } as Lead;
      });
      
      setScheduledLeads(leadsData);
      setLoadingScheduled(false);

      // Process scheduled leads for automatic cleanup of expired leads only
      // Note: 45-minute transitions are now handled by server-side Firebase Function
      const now = new Date();
      const leadsToRemoveBatch = writeBatch(db);
      let leadsRemovedCount = 0;

      querySnapshot.docs.forEach((docSnapshot) => {
        const lead = {id: docSnapshot.id, ...docSnapshot.data()} as Lead;
        const leadScheduledAppointmentTime = docSnapshot.data().scheduledAppointmentTime;

        if (leadScheduledAppointmentTime instanceof FirestoreTimestamp &&
            (lead.status === "rescheduled" || lead.status === "scheduled") &&
            !processedScheduledLeadIds.has(lead.id)) {
          const appointmentTime = leadScheduledAppointmentTime.toDate();
          const timePastAppointment = now.getTime() - appointmentTime.getTime();
          
          // Check lead age to prevent processing newly created leads
          const leadAge = lead.createdAt ? now.getTime() - lead.createdAt.toDate().getTime() : Infinity;
          
          // Skip processing if lead is too new (less than 2 minutes old)
          if (leadAge < MIN_LEAD_AGE_MS) {
            console.log('⏸️ Skipping newly created lead:', lead.customerName, 'Age:', Math.round(leadAge / 1000), 'seconds');
            return;
          }

          // Only process leads that are actually past their appointment time (positive timePastAppointment)
          if (timePastAppointment > 0) {
            if (timePastAppointment >= (10 * 60 * 1000) && !lead.setterVerified) {
              console.log('❌ Canceling unverified lead past 10 minutes:', lead.customerName);
              const leadRef = doc(db, "leads", lead.id);
              leadsToRemoveBatch.update(leadRef, {
                status: "canceled",
                dispositionNotes: "Automatically canceled - not verified within 10 minutes of scheduled time",
                updatedAt: serverTimestamp(),
              });
              setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
              leadsRemovedCount++;
            }
            else if (timePastAppointment >= FIFTEEN_MINUTES_MS) {
              console.log('⏰ Expiring lead past 15 minutes:', lead.customerName);
              const leadRef = doc(db, "leads", lead.id);
              leadsToRemoveBatch.update(leadRef, {
                status: "expired",
                dispositionNotes: "Appointment expired - 15 minutes past scheduled time",
                updatedAt: serverTimestamp(),
              });
              setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
              leadsRemovedCount++;
            }
          }
          // 45-minute transition logic removed - now handled by server-side Firebase Function
        }
      });

      if (leadsRemovedCount > 0) {
        try {
          await leadsToRemoveBatch.commit();
          console.log(`✅ Successfully removed ${leadsRemovedCount} expired/unverified leads`);
          toast({
            title: "Expired Leads Processed",
            description: `${leadsRemovedCount} lead(s) past their scheduled time were automatically processed.`,
            variant: "destructive",
          });
        } catch (_error) {
          console.error("Error removing expired leads:", _error);
          toast({
            title: "Processing Failed",
            description: "Could not process expired leads automatically.",
            variant: "destructive",
          });
        }
      }
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load scheduled leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingScheduled(false);
    });

    return () => unsubscribeScheduled();
  }, [user, toast, processedScheduledLeadIds]);

  // Removed: Client-side backup auto-assignment logic (Firebase Functions now handle this)
  // The following useEffect hooks have been removed:
  // 1. Track assigned closer IDs for auto-assignment logic  
  // 2. Track available closers for auto-assignment
  // 3. Client-side backup auto-assignment with 3-second delay

  const renderLeadsList = (leads: Lead[], isLoading: boolean, type: Tab) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
        </div>
      );
    }

    if (leads.length === 0) {
      let emptyMessage = "";
      switch (type) {
        case "waiting":
          emptyMessage = "No leads are waiting for assignment.";
          break;
        case "scheduled":
          emptyMessage = `No leads are scheduled for ${format(selectedDate, "MMM d, yyyy")}.`;
          break;
        default:
          emptyMessage = "No leads found.";
      }
      
      return (
        <div className="text-center text-[var(--text-secondary)] py-10">
          <p>{emptyMessage}</p>
        </div>
      );
    }

    // Filter scheduled leads by selected date
    const filteredLeads = type === "scheduled" 
      ? leads.filter(lead => {
          if (!lead.scheduledAppointmentTime) {
            return false;
          }
          
          // Special case: if selectedDate is in far future (show all mode)
          if (selectedDate.getFullYear() > 2029) {
            return true;
          }
          
          const appointmentDate = lead.scheduledAppointmentTime.toDate();
          
          // Use more forgiving date comparison for same day
          const selectedDateStart = new Date(selectedDate);
          selectedDateStart.setHours(0, 0, 0, 0);
          const selectedDateEnd = new Date(selectedDate);
          selectedDateEnd.setHours(23, 59, 59, 999);
          
          const appointmentTime = appointmentDate.getTime();
          const isInDateRange = appointmentTime >= selectedDateStart.getTime() && appointmentTime <= selectedDateEnd.getTime();
          
          return isInDateRange;
        })
      : leads;

    // Determine height based on lead count for responsive behavior
    const getScrollHeight = () => {
      const leadCount = filteredLeads.length;
      if (leadCount <= 3) return "auto";
      if (leadCount <= 6) return "h-[300px]";
      return "h-[400px]";
    };

    return (
      <ScrollArea className={`${getScrollHeight()} pr-4 -mr-4`}>
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            // For scheduled leads, show enhanced card with verification checkbox
            if (type === "scheduled") {
              const appointmentTime = lead.scheduledAppointmentTime?.toDate();
              const now = new Date();
              const timeUntilAppointment = appointmentTime ? appointmentTime.getTime() - now.getTime() : null;
              const isUrgent = timeUntilAppointment && timeUntilAppointment <= 60 * 60 * 1000; // Within 1 hour
              const isCritical = timeUntilAppointment && timeUntilAppointment <= 15 * 60 * 1000; // Within 15 minutes
              const isPast = timeUntilAppointment && timeUntilAppointment < 0;
              
              return (
                <div key={lead.id} className={`aurelian-scheduled-card ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''} ${isPast ? 'past-due' : ''} ${lead.setterVerified ? 'verified' : 'unverified'} transition-all duration-300`}>
                  {/* Urgency Indicator Bar */}
                  {(isUrgent || isCritical || isPast) && (
                    <div className={`aurelian-urgency-bar ${isCritical ? 'critical' : isPast ? 'past' : 'urgent'}`} />
                  )}
                  
                  {/* Main clickable area - excludes verification zone */}
                  <div 
                    className="cursor-pointer hover:bg-white/5 transition-colors duration-200"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <div className="p-4 pr-0">
                      <div className="flex items-start gap-3">
                        {/* Dynamic Status Avatar */}
                        <div className={`aurelian-appointment-avatar ${lead.setterVerified ? 'verified' : 'unverified'}`}>
                          {lead.setterVerified ? (
                            <div className="checkmark-icon">✓</div>
                          ) : (
                            <CalendarClock className="w-5 h-5" />
                          )}
                        </div>
                        
                        {/* Main Content - excludes verification area */}
                        <div className="flex-1 min-w-0 pr-4">
                          {/* Customer Name with Priority Indicator */}
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="aurelian-customer-name">
                              {lead.customerName}
                            </h3>
                            {isUrgent && (
                              <span className="aurelian-priority-badge">
                                {isCritical ? '🔥' : '⚡'}
                              </span>
                            )}
                          </div>
                          
                          {/* Appointment Time - Prominent Display */}
                          <div className="aurelian-appointment-time">
                            <CalendarClock className="w-4 h-4 mr-2" />
                            <span className="font-semibold">
                              {appointmentTime ? format(appointmentTime, "MMM d, h:mm a") : "No time set"}
                            </span>
                            {timeUntilAppointment && (
                              <span className={`aurelian-time-indicator ${isUrgent ? 'urgent' : ''}`}>
                                {isPast ? ' (Overdue)' : ` (${Math.floor(timeUntilAppointment / (60 * 1000))}m)`}
                              </span>
                            )}
                          </div>
                          
                          {/* Secondary Info */}
                          <div className="aurelian-lead-meta">
                            <span>Source: {lead.setterName || 'Web Inquiry'}</span>
                            {lead.assignedCloserName && (
                              <span className="aurelian-closer-assigned">
                                • Closer: {lead.assignedCloserName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separate Verification Zone - iOS-compliant touch target */}
                  <div className="absolute top-0 right-0 h-full flex flex-col items-center justify-center px-2 bg-gradient-to-l from-black/10 to-transparent">
                    <div className="aurelian-verification-zone flex flex-col items-center gap-1">
                      {lead.id && (
                        <VerifiedCheckbox 
                          leadId={lead.id} 
                          variant="compact"
                          className="mb-1"
                        />
                      )}
                      <div className={`aurelian-verification-status text-center ${lead.setterVerified ? 'verified' : 'pending'}`}>
                        <span className="text-xs font-medium">
                          {lead.setterVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // For waiting leads, use the standard card with click handler
            return (
              <div key={lead.id} className="frosted-glass-card mb-2 overflow-hidden">
                <LeadCard lead={lead} context="queue-waiting" onLeadClick={handleLeadClick} />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <>
      {/* Section Header */}
      <h2 className="text-lg font-bold text-[#FFFFFF] mb-3">Lead Queue</h2>
      
      {/* Tab Bar */}
      <div className="flex border-b border-[var(--glass-border)] mb-4">
        {/* Individual Tabs */}
        <button
          onClick={() => setActiveTab("waiting")}
          className={cn(
            "py-2 px-4 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "waiting"
              ? "text-[var(--accent-light)] border-[var(--accent-light)] active-tab"
              : "text-[var(--text-secondary)] border-transparent hover:text-[#FFFFFF]"
          )}
        >
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Waiting List 
            {(() => {
              const verifiedWaiting = waitingLeads.filter(lead => lead.setterVerified === true).length;
              const unverifiedWaiting = waitingLeads.filter(lead => lead.setterVerified !== true).length;
              
              // Aurelian's enhanced urgency detection
              const isHighUrgency = unverifiedWaiting > 3;
              const isHighCapacity = verifiedWaiting > 5;
              
              return (
                <div className="flex items-center gap-1.5">
                  {/* Always show verified badge - even when 0 for consistency */}
                  <div className="group relative">
                    <span 
                      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white rounded-full min-w-[1.5rem] h-6 shadow-lg transition-all duration-200 active:scale-95 ${
                        verifiedWaiting === 0
                          ? "bg-gray-500/50 backdrop-blur-sm text-white/60 shadow-gray-500/25"
                          : isHighCapacity 
                            ? "bg-green-600 shadow-green-600/40 animate-pulse" 
                            : "bg-green-500/90 backdrop-blur-sm shadow-green-500/25"
                      }`}
                      onTouchStart={() => {
                        if (navigator.vibrate) navigator.vibrate(verifiedWaiting > 0 ? 5 : 3);
                      }}
                      title={verifiedWaiting === 0 
                        ? "No verified leads waiting"
                        : `${verifiedWaiting} verified lead${verifiedWaiting !== 1 ? 's' : ''} ready to assign`}
                    >
                      ✓{verifiedWaiting}
                    </span>
                    {/* Aurelian's progressive disclosure tooltip */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {verifiedWaiting === 0 ? "No verified leads" : "Ready to assign"}
                    </div>
                  </div>
                  
                  {/* Always show unverified badge - even when 0 for consistency */}
                  <div className="group relative">
                    <span 
                      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white rounded-full min-w-[1.5rem] h-6 shadow-lg transition-all duration-200 active:scale-95 ${
                        unverifiedWaiting === 0
                          ? "bg-gray-500/50 backdrop-blur-sm text-white/60 shadow-gray-500/25"
                          : isHighUrgency 
                            ? "bg-red-500 shadow-red-500/40 animate-pulse" 
                            : "bg-orange-500/90 backdrop-blur-sm shadow-orange-500/25"
                      }`}
                      onTouchStart={() => {
                        if (navigator.vibrate) navigator.vibrate(unverifiedWaiting === 0 ? 3 : isHighUrgency ? 15 : 8);
                      }}
                      title={unverifiedWaiting === 0 
                        ? "No leads need verification"
                        : `${unverifiedWaiting} lead${unverifiedWaiting !== 1 ? 's' : ''} need${unverifiedWaiting === 1 ? 's' : ''} verification`}
                    >
                      !{unverifiedWaiting}
                    </span>
                    {/* Aurelian's progressive disclosure tooltip */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {unverifiedWaiting === 0 
                        ? "No verification needed" 
                        : isHighUrgency ? "Urgent: Verify now!" : "Needs verification"}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={cn(
            "py-2 px-4 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "scheduled"
              ? "text-[var(--accent-light)] border-[var(--accent-light)] active-tab"
              : "text-[var(--text-secondary)] border-transparent hover:text-[#FFFFFF]"
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Scheduled 
            {(() => {
              const now = new Date();
              
              const filteredScheduledLeads = scheduledLeads.filter(lead => {
                if (!lead.scheduledAppointmentTime) return false;
                
                // Special case: if selectedDate is in far future (show all mode)
                if (selectedDate.getFullYear() > 2029) {
                  // For "all dates" mode, exclude leads 15+ minutes past their scheduled time
                  const appointmentTime = lead.scheduledAppointmentTime.toDate();
                  const timePastAppointment = now.getTime() - appointmentTime.getTime();
                  return timePastAppointment < FIFTEEN_MINUTES_MS;
                }
                
                const appointmentDate = lead.scheduledAppointmentTime.toDate();
                const selectedDateStart = new Date(selectedDate);
                selectedDateStart.setHours(0, 0, 0, 0);
                const selectedDateEnd = new Date(selectedDate);
                selectedDateEnd.setHours(23, 59, 59, 999);
                
                const appointmentTime = appointmentDate.getTime();
                const isInDateRange = appointmentTime >= selectedDateStart.getTime() && appointmentTime <= selectedDateEnd.getTime();
                
                // For specific date, also exclude leads 15+ minutes past their scheduled time
                if (isInDateRange) {
                  const timePastAppointment = now.getTime() - appointmentTime;
                  return timePastAppointment < FIFTEEN_MINUTES_MS;
                }
                
                return false;
              });
              
              const totalCount = filteredScheduledLeads.length;
              
              return (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-blue-500/90 backdrop-blur-sm rounded-full min-w-[1.5rem] h-6 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95">
                  {totalCount}
                </span>
              );
            })()}
          </div>
        </button>
      </div>

      {/* Date Navigator for Scheduled Tab */}
      {activeTab === "scheduled" && (
        <div className="flex items-center justify-center mb-4">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-center text-sm font-medium bg-white/5 border-[var(--glass-border)] text-[#FFFFFF] hover:bg-white/10 px-4 py-2"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate.getFullYear() > 2029 ? "All Dates" : format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl" align="center" style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(255, 255, 255, 0.98)',
              borderColor: 'rgba(0, 0, 0, 0.15)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)',
            }}>
              <div className="p-3 border-b border-border">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      setSelectedDate(today);
                      setIsDatePickerOpen(false);
                    }}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const farFutureDate = new Date('2030-12-31');
                      setSelectedDate(farFutureDate);
                      setIsDatePickerOpen(false);
                    }}
                    className="text-xs"
                  >
                    All Dates
                  </Button>
                </div>
              </div>
              <CalendarComponent
                mode="single"
                selected={selectedDate.getFullYear() > 2029 ? undefined : selectedDate}
                onSelect={(date) => {
                  if (date) {
                    const newDate = new Date(date);
                    newDate.setHours(0, 0, 0, 0);
                    setSelectedDate(newDate);
                    setIsDatePickerOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Tab Content */}
      <div className={activeTab === "waiting" ? "block" : "hidden"}>
        {renderLeadsList(waitingLeads, loadingWaiting, "waiting")}
      </div>
      <div className={activeTab === "scheduled" ? "block" : "hidden"}>
        {renderLeadsList(scheduledLeads, loadingScheduled, "scheduled")}
      </div>
      <LeadDetailsDialog 
        lead={selectedLead} 
        isOpen={!!selectedLead} 
        onClose={handleCloseDialog} 
        context={activeTab === "waiting" ? "queue-waiting" : "queue-scheduled"}
      />
    </>
  );
}
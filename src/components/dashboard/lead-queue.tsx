"use client";

import { useState, useEffect } from "react";
import type { Lead, Closer } from "@/types";
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

const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;
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
  const [availableClosers, setAvailableClosers] = useState<Closer[]>([]);
  const [loadingClosers, setLoadingClosers] = useState(true);
  const [assignedLeadCloserIds, setAssignedLeadCloserIds] = useState<Set<string>>(new Set());
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
    setSelectedLead(lead);
  };

  const handleCloseDialog = () => {
    setSelectedLead(null);
  };

  // --- All existing useEffect hooks for data fetching remain unchanged ---
  useEffect(() => {
    if (!user || !user.teamId) {
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }
    setLoadingWaiting(true);

    const qWaiting = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc")
    );

    const unsubscribeWaiting = onSnapshot(qWaiting, (querySnapshot) => {
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
      
      const unassignedLeads = leadsData.filter(lead => !lead.assignedCloserId);
      setWaitingLeads(unassignedLeads);
      setLoadingWaiting(false);
    }, (_error) => {
      toast({
        title: "Error",
        description: "Failed to load waiting leads. Please refresh the page.",
        variant: "destructive",
      });
      setLoadingWaiting(false);
    });

    return () => unsubscribeWaiting();
  }, [user, toast]);

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

      const now = new Date();
      const leadsToMoveBatch = writeBatch(db);
      const leadsToRemoveBatch = writeBatch(db);
      let leadsMovedCount = 0;
      let leadsRemovedCount = 0;

      querySnapshot.docs.forEach((docSnapshot) => {
        const lead = {id: docSnapshot.id, ...docSnapshot.data()} as Lead;
        const leadScheduledAppointmentTime = docSnapshot.data().scheduledAppointmentTime;

        if (leadScheduledAppointmentTime instanceof FirestoreTimestamp &&
            (lead.status === "rescheduled" || lead.status === "scheduled") &&
            !processedScheduledLeadIds.has(lead.id)) {
          const appointmentTime = leadScheduledAppointmentTime.toDate();
          const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
          const timePastAppointment = now.getTime() - appointmentTime.getTime();
          
          // Check lead age to prevent processing newly created leads
          const leadAge = lead.createdAt ? now.getTime() - lead.createdAt.toDate().getTime() : Infinity;
          
          // Skip further processing - normal operation

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
          // Handle future appointments (negative timePastAppointment means appointment is in the future)
          else if (timeUntilAppointment <= FORTY_FIVE_MINUTES_MS && timeUntilAppointment > 0 && lead.setterVerified === true) {
            console.log('⏭️ Moving verified lead to waiting assignment (45 min window):', lead.customerName);
            const leadRef = doc(db, "leads", lead.id);
            leadsToMoveBatch.update(leadRef, {
              status: "waiting_assignment",
              updatedAt: serverTimestamp(),
            });
            setProcessedScheduledLeadIds((prev) => new Set(prev).add(lead.id));
            leadsMovedCount++;
          }
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

      if (leadsMovedCount > 0) {
        try {
          await leadsToMoveBatch.commit();
          console.log(`✅ Successfully moved ${leadsMovedCount} verified leads to waiting assignment`);
          toast({
            title: "Verified Leads Ready",
            description: `${leadsMovedCount} verified lead(s) moved to waiting list for assignment.`,
          });
        } catch {
          toast({
            title: "Update Failed",
            description: "Could not move verified leads automatically.",
            variant: "destructive",
          });
          const failedLeadIds = querySnapshot.docs
            .filter((docSnapshot) => {
              const leadData = docSnapshot.data();
              const leadSchedTime = leadData.scheduledAppointmentTime;
              return leadSchedTime instanceof FirestoreTimestamp &&
                       (leadData.status === "rescheduled" || leadData.status === "scheduled") &&
                       (leadSchedTime.toDate().getTime() - now.getTime() <= FORTY_FIVE_MINUTES_MS) &&
                       leadData.setterVerified === true &&
                       processedScheduledLeadIds.has(docSnapshot.id);
            })
            .map((l) => l.id);

          setProcessedScheduledLeadIds((prev) => {
            const newSet = new Set(prev);
            failedLeadIds.forEach((id) => newSet.delete(id));
            return newSet;
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

  useEffect(() => {
    if (!user?.teamId) {
      setAssignedLeadCloserIds(new Set());
      setLoadingClosers(false);
      return;
    }

    setLoadingClosers(true);
    const leadsQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
    );

    const unsubscribeLeads = onSnapshot(
      leadsQuery,
      (querySnapshot) => {
        const assignedCloserIds = new Set<string>();
        querySnapshot.forEach((doc) => {
          const lead = doc.data() as Lead;
          if (lead.assignedCloserId) {
            assignedCloserIds.add(lead.assignedCloserId);
          }
        });
        setAssignedLeadCloserIds(assignedCloserIds);
      },
      (_error) => {
        console.error("Failed to load assigned closers for auto-assignment:", _error);
      }
    );
    return () => unsubscribeLeads();
  }, [user?.teamId]);

  useEffect(() => {
    if (!user?.teamId) {
      setAvailableClosers([]);
      setLoadingClosers(false);
      return;
    }

    const closersCollectionQuery = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      where("status", "==", "On Duty"),
      orderBy("name", "asc")
    );

    const unsubscribeClosers = onSnapshot(
      closersCollectionQuery,
      (querySnapshot) => {
        const allOnDutyClosers = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: data.name,
            status: data.status as "On Duty" | "Off Duty",
            teamId: data.teamId,
            role: data.role,
            avatarUrl: data.avatarUrl,
            phone: data.phone,
            lineupOrder: data.lineupOrder,
          } as Closer;
        });

        const filteredAvailableClosers = allOnDutyClosers.filter(
          (closer) => !assignedLeadCloserIds.has(closer.uid)
        );

        const sortedAvailableClosers = filteredAvailableClosers
          .map((closer, index) => ({
            ...closer,
            lineupOrder:
              typeof closer.lineupOrder === "number" ?
                closer.lineupOrder :
                (index + 1) * 100000,
          }))
          .sort((a, b) => {
            const orderA = a.lineupOrder ?? ((a.lineupOrder || 0) + 1) * 100000;
            const orderB = b.lineupOrder ?? ((b.lineupOrder || 0) + 1) * 100000;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
          });

        setAvailableClosers(sortedAvailableClosers);
        setLoadingClosers(false);
      },
      (_error) => {
        console.error("Failed to load available closers for auto-assignment:", _error);
        setAvailableClosers([]);
        setLoadingClosers(false);
      }
    );

    return () => unsubscribeClosers();
  }, [user?.teamId, assignedLeadCloserIds]);

  useEffect(() => {
    if (loadingWaiting || loadingClosers || !user?.teamId) return;
    if (waitingLeads.length === 0 || availableClosers.length === 0) return;

    const assignLeadsToClosers = async () => {
      try {
        const batch = writeBatch(db);
        let assignmentsCount = 0;

        const sortedWaitingLeads = [...waitingLeads]
          .filter(lead => !lead.assignedCloserId && lead.status === "waiting_assignment")
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return a.createdAt.toMillis() - b.createdAt.toMillis();
          });

        const assignmentsToMake = Math.min(sortedWaitingLeads.length, availableClosers.length);
        
        for (let i = 0; i < assignmentsToMake; i++) {
          const lead = sortedWaitingLeads[i];
          const closer = availableClosers[i];

          if (lead && closer) {
            const leadRef = doc(db, "leads", lead.id);
            batch.update(leadRef, {
              status: "waiting_assignment",
              assignedCloserId: closer.uid,
              assignedCloserName: closer.name,
              updatedAt: serverTimestamp(),
            });
            assignmentsCount++;
          }
        }

        if (assignmentsCount > 0) {
          await batch.commit();
          toast({
            title: "Leads Assigned",
            description: `${assignmentsCount} lead(s) automatically assigned to available closers.`,
          });
        }
      } catch (_error) {
        console.error("Failed to auto-assign leads:", _error);
        toast({
          title: "Assignment Failed",
          description: "Could not automatically assign leads to closers.",
          variant: "destructive",
        });
      }
    };
    
    const assignmentTimer = setTimeout(assignLeadsToClosers, 1000);
    return () => clearTimeout(assignmentTimer);
  }, [waitingLeads, availableClosers, loadingWaiting, loadingClosers, user?.teamId, toast]);

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
                <div key={lead.id} className={`aurelian-scheduled-card ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''} ${isPast ? 'past-due' : ''} ${lead.setterVerified ? 'verified' : 'unverified'} cursor-pointer transition-all duration-300`} onClick={() => handleLeadClick(lead)}>
                  {/* Urgency Indicator Bar */}
                  {(isUrgent || isCritical || isPast) && (
                    <div className={`aurelian-urgency-bar ${isCritical ? 'critical' : isPast ? 'past' : 'urgent'}`} />
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Dynamic Status Avatar */}
                      <div className={`aurelian-appointment-avatar ${lead.setterVerified ? 'verified' : 'unverified'}`}>
                        {lead.setterVerified ? (
                          <div className="checkmark-icon">✓</div>
                        ) : (
                          <CalendarClock className="w-5 h-5" />
                        )}
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
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
                          
                          {/* Verification Status */}
                          <div className="aurelian-verification-zone">
                            {lead.id && <VerifiedCheckbox leadId={lead.id} />}
                            <div className={`aurelian-verification-status ${lead.setterVerified ? 'verified' : 'pending'}`}>
                              {lead.setterVerified ? 'Verified' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // For waiting leads, use the standard card
            return (
              <div key={lead.id} className="frosted-glass-card mb-2 overflow-hidden cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleLeadClick(lead)}>
                {lead && <LeadCard lead={lead} context="queue-waiting" />}
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
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-[#007AFF] rounded-full min-w-[1.5rem] h-6 shadow-lg shadow-[#007AFF]/25">
              {waitingLeads.length}
            </span>
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
              const scheduledCount = scheduledLeads.filter(lead => {
                if (!lead.scheduledAppointmentTime) return false;
                
                // Special case: if selectedDate is in far future (show all mode)
                if (selectedDate.getFullYear() > 2029) {
                  return true;
                }
                
                const appointmentDate = lead.scheduledAppointmentTime.toDate();
                const selectedDateStart = new Date(selectedDate);
                selectedDateStart.setHours(0, 0, 0, 0);
                const selectedDateEnd = new Date(selectedDate);
                selectedDateEnd.setHours(23, 59, 59, 999);
                
                const appointmentTime = appointmentDate.getTime();
                return appointmentTime >= selectedDateStart.getTime() && appointmentTime <= selectedDateEnd.getTime();
              }).length;
              
              return (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-[#007AFF] rounded-full min-w-[1.5rem] h-6 shadow-lg shadow-[#007AFF]/25">
                  {scheduledCount}
                </span>
              );
            })()}
          </div>
        </button>
      </div>

      {/* Date Navigator for Scheduled Tab - Simplified */}
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
            <PopoverContent className="w-auto p-0" align="center">
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
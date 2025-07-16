"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Lead } from "@/types";
import { Loader2, Users, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import LeadCard from "./lead-card";
import ScheduledLeadsSection from "./scheduled-leads-enhanced";
import LeadDetailsDialog from "./lead-details-dialog";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type Tab = "waiting" | "scheduled";

export default function LeadQueueClean() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("waiting");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Fetch waiting leads
  useEffect(() => {
    if (!user?.teamId) {
      setLoadingWaiting(false);
      setWaitingLeads([]);
      return;
    }

    setLoadingWaiting(true);

    const waitingQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "==", "waiting_assignment"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      waitingQuery,
      (querySnapshot) => {
        const leads = querySnapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          
          return {
            id: docSnapshot.id,
            customerName: data.customerName || "Unknown Customer",
            customerPhone: data.customerPhone || "N/A",
            address: data.address || "",
            status: data.status,
            teamId: data.teamId,
            dispatchType: data.dispatchType || "immediate",
            assignedCloserId: data.assignedCloserId || null,
            assignedCloserName: data.assignedCloserName || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            dispositionNotes: data.dispositionNotes || "",
            scheduledAppointmentTime: data.scheduledAppointmentTime,
            setterId: data.setterId || null,
            setterName: data.setterName || null,
            setterLocation: data.setterLocation || null,
            photoUrls: data.photoUrls || [],
            setterVerified: data.setterVerified || false,
            verifiedAt: data.verifiedAt || null,
            verifiedBy: data.verifiedBy || null,
          } as Lead;
        });

        // Filter out assigned leads for waiting list
        const unassignedLeads = leads.filter(lead => !lead.assignedCloserId);
        
        setWaitingLeads(unassignedLeads);
        setLoadingWaiting(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to load waiting leads. Please refresh the page.",
          variant: "destructive",
        });
        setLoadingWaiting(false);
      }
    );

    return () => unsubscribe();
  }, [user?.teamId, toast]);

  // Fetch scheduled leads for count display
  useEffect(() => {
    if (!user?.teamId) {
      setLoadingScheduled(false);
      setScheduledLeads([]);
      return;
    }

    setLoadingScheduled(true);

    const scheduledQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["scheduled", "rescheduled", "needs_verification"]),
      orderBy("scheduledAppointmentTime", "asc")
    );

    const unsubscribe = onSnapshot(
      scheduledQuery,
      (querySnapshot) => {
        const leads = querySnapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          
          return {
            id: docSnapshot.id,
            customerName: data.customerName || "Unknown Customer",
            customerPhone: data.customerPhone || "N/A",
            address: data.address || "",
            status: data.status,
            teamId: data.teamId,
            dispatchType: data.dispatchType || "immediate",
            assignedCloserId: data.assignedCloserId || null,
            assignedCloserName: data.assignedCloserName || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            dispositionNotes: data.dispositionNotes || "",
            scheduledAppointmentTime: data.scheduledAppointmentTime,
            setterId: data.setterId || null,
            setterName: data.setterName || null,
            setterLocation: data.setterLocation || null,
            photoUrls: data.photoUrls || [],
            setterVerified: data.setterVerified || false,
            verifiedAt: data.verifiedAt || null,
            verifiedBy: data.verifiedBy || null,
          } as Lead;
        });

        setScheduledLeads(leads);
        setLoadingScheduled(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Failed to load scheduled leads. Please refresh the page.",
          variant: "destructive",
        });
        setLoadingScheduled(false);
      }
    );

    return () => unsubscribe();
  }, [user?.teamId, toast]);

  const handleLeadClick = (lead: Lead) => {
    console.log('🔥 LeadQueueClean - Lead clicked:', { 
      leadId: lead.id, 
      customerName: lead.customerName,
      context: "queue-waiting",
      userRole: user?.role 
    });
    setSelectedLead(lead);
  };

  const handleCloseDialog = () => {
    setSelectedLead(null);
  };

  const renderWaitingLeads = () => {
    if (loadingWaiting) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">Loading waiting leads...</span>
        </div>
      );
    }

    if (waitingLeads.length === 0) {
      return (
        <div className="text-center text-gray-400 py-10">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No waiting leads</p>
          <p className="text-sm">All leads have been assigned to closers.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {waitingLeads.map((lead) => (
            <div key={lead.id} className="w-full">
              <LeadCard 
                lead={lead} 
                context="queue-waiting"
                onLeadClick={handleLeadClick}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("waiting")}
          className={cn(
            "py-3 px-6 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "waiting"
              ? "text-blue-400 border-blue-400"
              : "text-gray-400 border-transparent hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Waiting List 
            {(() => {
              const verifiedWaiting = waitingLeads.filter(lead => lead.setterVerified === true).length;
              const unverifiedWaiting = waitingLeads.filter(lead => lead.setterVerified !== true).length;
              
              // Aurelian's compact but smart urgency detection
              const isHighUrgency = unverifiedWaiting > 3;
              
              return (
                <div className="flex items-center gap-1">
                  {verifiedWaiting > 0 && (
                    <span 
                      className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-white bg-green-500/90 backdrop-blur-sm rounded-full min-w-[1.25rem] h-5 shadow-lg shadow-green-500/25 transition-all duration-150 active:scale-95"
                      title={`${verifiedWaiting} verified lead${verifiedWaiting !== 1 ? 's' : ''} ready`}
                    >
                      ✓{verifiedWaiting}
                    </span>
                  )}
                  {unverifiedWaiting > 0 && (
                    <span 
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-white rounded-full min-w-[1.25rem] h-5 shadow-lg transition-all duration-150 active:scale-95 ${
                        isHighUrgency 
                          ? "bg-red-500 shadow-red-500/40 animate-pulse" 
                          : "bg-orange-500/90 backdrop-blur-sm shadow-orange-500/25"
                      }`}
                      title={`${unverifiedWaiting} lead${unverifiedWaiting !== 1 ? 's' : ''} need verification`}
                    >
                      !{unverifiedWaiting}
                    </span>
                  )}
                  {waitingLeads.length === 0 && (
                    <span 
                      className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-white/60 bg-gray-500/50 backdrop-blur-sm rounded-full min-w-[1.25rem] h-5 shadow-lg shadow-gray-500/25"
                      title="No waiting leads"
                    >
                      ∅
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab("scheduled")}
          className={cn(
            "py-3 px-6 text-sm font-semibold border-b-2 transition-colors focus:outline-none",
            activeTab === "scheduled"
              ? "text-blue-400 border-blue-400"
              : "text-gray-400 border-transparent hover:text-white"
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Scheduled
            {(() => {
              if (loadingScheduled) {
                return null;
              }

              const now = new Date();
              
              // Filter out leads that are 15+ minutes past their scheduled time
              const activeScheduledLeads = scheduledLeads.filter(lead => {
                if (!lead.scheduledAppointmentTime) return false;
                
                const appointmentTime = lead.scheduledAppointmentTime.toDate();
                const timePastAppointment = now.getTime() - appointmentTime.getTime();
                return timePastAppointment < FIFTEEN_MINUTES_MS;
              });

              const totalCount = activeScheduledLeads.length;
              
              return (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-blue-500/90 backdrop-blur-sm rounded-full min-w-[1.5rem] h-6 shadow-lg shadow-blue-500/25 transition-all duration-200 active:scale-95">
                  {totalCount}
                </span>
              );
            })()}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "waiting" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Waiting for Assignment</h2>
            <span className="text-sm text-gray-400">({waitingLeads.length} leads)</span>
          </div>
          {renderWaitingLeads()}
        </div>
      )}

      {activeTab === "scheduled" && (
        <ScheduledLeadsSection />
      )}

      {/* Lead Details Modal */}
      <LeadDetailsDialog 
        lead={selectedLead} 
        isOpen={!!selectedLead} 
        onClose={handleCloseDialog} 
        context="queue-waiting"
      />
    </div>
  );
}

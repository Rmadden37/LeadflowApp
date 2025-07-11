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

type Tab = "waiting" | "scheduled";

export default function LeadQueueClean() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [waitingLeads, setWaitingLeads] = useState<Lead[]>([]);
  const [loadingWaiting, setLoadingWaiting] = useState(true);
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

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
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
            <span className="text-xs font-normal opacity-75">({waitingLeads.length})</span>
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
    </div>
  );
}

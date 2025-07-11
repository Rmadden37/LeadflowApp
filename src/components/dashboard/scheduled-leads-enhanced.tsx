"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Lead } from "@/types";
import { Loader2, Calendar, CalendarClock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isSameDay } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import LeadCard from "./lead-card";
import VerifiedCheckbox from "./verified-checkbox";
import { cn } from "@/lib/utils";

export default function ScheduledLeadsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [allScheduledLeads, setAllScheduledLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default to today
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch all scheduled leads
  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      setAllScheduledLeads([]);
      return;
    }

    setLoading(true);

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

        setAllScheduledLeads(leads);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching leads:', error);
        toast({
          title: "Error",
          description: "Failed to load scheduled leads. Please refresh the page.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.teamId, toast]);
  
  // Filter leads for the selected date
  const filteredLeads = allScheduledLeads.filter(lead => {
    if (!lead.scheduledAppointmentTime) {
      return false;
    }
    
    try {
      const appointmentDate = lead.scheduledAppointmentTime.toDate();
      return isSameDay(appointmentDate, selectedDate);
    } catch (error) {
      console.error('Error processing lead date:', error);
      return false;
    }
  });
  
  // Separate verified and unverified leads
  const verifiedLeads = filteredLeads.filter(lead => lead.setterVerified === true);
  const unverifiedLeads = filteredLeads.filter(lead => lead.setterVerified !== true);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading scheduled leads...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Date Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Scheduled Leads</h2>
          <span className="text-sm text-gray-400">
            ({filteredLeads.length} for selected date)
          </span>
        </div>
      </div>

      {/* Date Selection */}
      <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          <span className="text-white font-semibold">
            {format(selectedDate, "MMMM d, yyyy")}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Date Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className={cn(
              "text-xs",
              isSameDay(selectedDate, new Date()) ? "bg-blue-600 text-white" : "text-blue-300"
            )}
          >
            Today
          </Button>
          
          {/* Calendar Popover */}
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-transparent border-blue-500/30 text-blue-300 hover:bg-blue-600/20"
              >
                <CalendarDays className="mr-1 h-3 w-3" />
                Pick Date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Verification Stats */}
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-green-300">
                {verifiedLeads.length} verified
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-xs text-yellow-300">
                {unverifiedLeads.length} needs verification
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Leads List with Verification Sections */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-6">
          {filteredLeads.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No scheduled leads</p>
              <p className="text-sm">
                No leads are scheduled for {format(selectedDate, "MMMM d, yyyy")}
              </p>
            </div>
          ) : (
            <>
              {/* Unverified Leads Section */}
              {unverifiedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <h3 className="text-sm font-medium text-yellow-400">Needs Verification ({unverifiedLeads.length})</h3>
                  </div>
                  {unverifiedLeads.map((lead) => (
                    <div key={lead.id} className="w-full relative">
                      <LeadCard 
                        lead={lead} 
                        context="queue-scheduled"
                        onLeadClick={handleLeadClick}
                      />
                      <div className="absolute top-3 right-3">
                        <VerifiedCheckbox 
                          leadId={lead.id}
                          className="p-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verified Leads Section */}
              {verifiedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <h3 className="text-sm font-medium text-green-400">Verified ({verifiedLeads.length})</h3>
                  </div>
                  {verifiedLeads.map((lead) => (
                    <div key={lead.id} className="w-full relative">
                      <LeadCard 
                        lead={lead} 
                        context="queue-scheduled"
                        onLeadClick={handleLeadClick}
                      />
                      <div className="absolute top-3 right-3">
                        <VerifiedCheckbox 
                          leadId={lead.id}
                          className="p-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Custom Lead Details Dialog */}
      {selectedLead && (
        <Dialog open={showLeadDetails} onOpenChange={() => setShowLeadDetails(false)}>
          <DialogContent className="sm:max-w-[600px] bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">
                Lead Details
              </DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">
                View and manage lead information
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Customer</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedLead.customerName}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Phone</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedLead.customerPhone}</p>
                </div>
                
                {selectedLead.address && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-sm text-[var(--text-tertiary)]">Address</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedLead.address}</p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Status</p>
                  <p className="font-medium text-[var(--text-primary)]">{selectedLead.status}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Scheduled Time</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedLead.scheduledAppointmentTime ? 
                      format(selectedLead.scheduledAppointmentTime.toDate(), "MMM d, yyyy 'at' h:mm a") : 
                      "Not scheduled"}
                  </p>
                </div>
                
                <div className="col-span-2 space-y-1">
                  <p className="text-sm text-[var(--text-tertiary)]">Verification Status</p>
                  <div className="flex items-center gap-2">
                    <VerifiedCheckbox leadId={selectedLead.id} />
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedLead.setterVerified ? "Verified" : "Not Verified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

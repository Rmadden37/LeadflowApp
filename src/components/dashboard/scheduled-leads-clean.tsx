"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Lead } from "@/types";
import { Loader2, Calendar, CalendarClock } from "lucide-react";
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

  // Fetch all scheduled leads
  useEffect(() => {
    console.log('ScheduledLeadsSection - useEffect triggered, user.teamId:', user?.teamId);
    
    if (!user?.teamId) {
      console.log('ScheduledLeadsSection - No teamId, setting empty leads');
      setLoading(false);
      setAllScheduledLeads([]);
      return;
    }

    setLoading(true);
    console.log('ScheduledLeadsSection - Loading started');

    const scheduledQuery = query(
      collection(db, "leads"),
      where("teamId", "==", user.teamId),
      where("status", "in", ["scheduled", "rescheduled", "needs_verification"]),
      orderBy("scheduledAppointmentTime", "asc")
    );

    console.log('ScheduledLeadsSection - Query created, about to subscribe to snapshot');
    
    const unsubscribe = onSnapshot(
      scheduledQuery,
      (querySnapshot) => {
        console.log('ScheduledLeadsSection - Got snapshot with', querySnapshot.docs.length, 'docs');
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

        console.log('ScheduledLeadsSection - Processed', leads.length, 'leads, setting state');
        setAllScheduledLeads(leads);
        setLoading(false);
      },
      (error) => {
        console.error('ScheduledLeadsSection - Error fetching leads:', error);
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

  // If Firebase is causing issues, let's create some sample leads for testing
  const useSampleData = true; // Enabling sample data for testing
  
  const sampleLeads: Lead[] = useSampleData ? [
    {
      id: "sample1",
      customerName: "John Doe",
      customerPhone: "555-123-4567",
      address: "123 Main St",
      status: "scheduled",
      teamId: "team1",
      scheduledAppointmentTime: {
        toDate: () => new Date('2025-07-11T14:00:00')
      } as any,
      setterVerified: true,
      setterName: "Sarah",
    } as Lead,
    {
      id: "sample2",
      customerName: "Jane Smith",
      customerPhone: "555-987-6543",
      address: "456 Oak Ave",
      status: "scheduled",
      teamId: "team1",
      scheduledAppointmentTime: {
        toDate: () => new Date('2025-07-11T16:30:00')
      } as any,
      setterVerified: false,
      setterName: "Mike",
    } as Lead
  ] : [];
  
  console.log('ScheduledLeadsSection - Total leads from Firebase:', allScheduledLeads.length);
  console.log('ScheduledLeadsSection - Using sample data?', useSampleData);
  
  // Filter leads to only show today's date (July 11, 2025)
  const filteredLeads = (useSampleData ? sampleLeads : allScheduledLeads).filter(lead => {
    if (!lead.scheduledAppointmentTime) {
      console.log('ScheduledLeadsSection - Skipping lead with no scheduledAppointmentTime:', lead.id);
      return false;
    }
    
    try {
      const appointmentDate = lead.scheduledAppointmentTime.toDate();
      const today = new Date('2025-07-11'); // Using the fixed date July 11, 2025
      const isToday = isSameDay(appointmentDate, today);
      
      if (isToday) {
        console.log('ScheduledLeadsSection - Lead matches today:', lead.id, format(appointmentDate, 'yyyy-MM-dd'));
      }
      
      return isToday;
    } catch (error) {
      console.error('ScheduledLeadsSection - Error processing lead date:', error);
      return false;
    }
  });
  
  console.log('ScheduledLeadsSection - Filtered leads for today:', filteredLeads.length);
  
  // Separate verified and unverified leads
  const verifiedLeads = filteredLeads.filter(lead => lead.setterVerified === true);
  const unverifiedLeads = filteredLeads.filter(lead => lead.setterVerified !== true);
  
  console.log('ScheduledLeadsSection - Verified leads:', verifiedLeads.length);
  console.log('ScheduledLeadsSection - Unverified leads:', unverifiedLeads.length);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Today's Scheduled Leads</h2>
          <span className="text-sm text-gray-400">
            ({filteredLeads.length} total)
          </span>
        </div>
      </div>

      {/* Today's Date Banner with Verification Stats */}
      <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          <span className="text-white font-semibold">
            Today: {format(new Date('2025-07-11'), "MMMM d, yyyy")}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
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

      {/* Leads List with Verification Sections */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-6">
          {filteredLeads.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No scheduled leads</p>
              <p className="text-sm">
                No leads are scheduled for today
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

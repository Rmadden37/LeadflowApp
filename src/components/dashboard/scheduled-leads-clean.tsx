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
import LeadCard from "./lead-card";
import { cn } from "@/lib/utils";

export default function ScheduledLeadsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [allScheduledLeads, setAllScheduledLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  // Filter leads by selected date
  const filteredLeads = allScheduledLeads.filter(lead => {
    if (!lead.scheduledAppointmentTime) return false;
    
    const appointmentDate = lead.scheduledAppointmentTime.toDate();
    const isOnSelectedDate = isSameDay(appointmentDate, selectedDate);
    
    return isOnSelectedDate;
  });

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsDatePickerOpen(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
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
      {/* Header with Date Picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Scheduled Leads</h2>
          <span className="text-sm text-gray-400">
            ({allScheduledLeads.length} total, {filteredLeads.length} for selected date)
          </span>
        </div>
      </div>

      {/* Date Controls */}
      <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            setSelectedDate(today);
          }}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          Today
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const july10 = new Date(2025, 6, 10); // July 10, 2025
            setSelectedDate(july10);
          }}
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          July 10, 2025
        </Button>

        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {format(selectedDate, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="text-sm text-gray-400">
          Selected: {selectedDate.toLocaleDateString()}
        </div>
      </div>

      {/* Leads List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No scheduled leads</p>
              <p className="text-sm">
                No leads are scheduled for {format(selectedDate, "MMMM d, yyyy")}
              </p>
              {allScheduledLeads.length > 0 && (
                <p className="text-xs mt-2">
                  Try selecting a different date. You have {allScheduledLeads.length} total scheduled leads.
                </p>
              )}
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="w-full">
                <LeadCard 
                  lead={lead} 
                  context="queue-scheduled"
                  onLeadClick={handleLeadClick}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { Lead } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import LeadCard from "./lead-card";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

// Define the props interface for the component
interface ScheduledLeadsCalendarProps {
  scheduledLeads: Lead[];
  loading: boolean;
  isExpanded: boolean;
}

export default function ScheduledLeadsCalendar({ scheduledLeads, loading, isExpanded }: ScheduledLeadsCalendarProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Filter leads by selected date
  const filteredLeads = selectedDate 
    ? scheduledLeads.filter(lead => {
        if (!lead.scheduledAppointmentTime) return false;
        const appointmentDate = lead.scheduledAppointmentTime.toDate();
        const startOfSelectedDay = startOfDay(selectedDate);
        const endOfSelectedDay = endOfDay(selectedDate);
        return appointmentDate >= startOfSelectedDay && appointmentDate <= endOfSelectedDay;
      })
    : scheduledLeads;
  
  const leadsToShow = isExpanded ? filteredLeads : filteredLeads.slice(0, 3);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className="h-full flex flex-col">
          {/* Date Picker Header */}
          <div className="flex-shrink-0 p-3 border-b space-y-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date("1900-01-01")}
                  className="scheduled-leads-calendar"
                  classNames={{
                    day_selected: "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !bg-opacity-100 shadow-lg border-2 border-blue-400"
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
                  setSelectedDate(today);
                }}
                className="text-xs"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(undefined)}
                className="text-xs"
              >
                All Days
              </Button>
            </div>
          </div>

          {/* Leads List */}
          <ScrollArea className="flex-1 w-full">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full p-4">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold text-sm">No Scheduled Leads</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDate 
                    ? `No appointments on ${format(selectedDate, "MMM d, yyyy")}`
                    : "Appointments will appear here."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-3 w-full">
                {leadsToShow.map((lead) => (
                  <div key={lead.id} className="w-full">
                    <LeadCard 
                      lead={lead} 
                      context="queue-scheduled"
                      onLeadClick={handleLeadClick}
                    />
                  </div>
                ))}
                {!isExpanded && filteredLeads.length > 3 && (
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Expand to see {filteredLeads.length - 3} more
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </TooltipProvider>
      
      {/* Modal for lead details */}
      {selectedLead && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scheduled Lead Details</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <LeadCard lead={selectedLead} context="all-leads" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
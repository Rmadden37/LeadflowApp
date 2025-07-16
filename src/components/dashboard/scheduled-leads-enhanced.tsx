"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Lead } from "@/types";
import { 
  Loader2, 
  Calendar, 
  CalendarClock, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isSameDay, addDays, subDays, isToday, isTomorrow, differenceInMinutes } from "date-fns";
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
import LeadDispositionModal from "./lead-disposition-modal";
import { cn } from "@/lib/utils";

// Enhanced Lead Card with mobile optimizations and swipe actions
const EnhancedLeadCard = ({ 
  lead, 
  onLeadClick, 
  onCall, 
  onReschedule, 
  onComplete 
}: {
  lead: Lead;
  onLeadClick: (lead: Lead) => void;
  onCall: (lead: Lead) => void;
  onReschedule: (lead: Lead) => void;
  onComplete: (lead: Lead) => void;
}) => {
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const appointmentTime = lead.scheduledAppointmentTime?.toDate();
  const now = new Date();
  const minutesUntil = appointmentTime ? differenceInMinutes(appointmentTime, now) : null;
  
  // Determine urgency without aggressive badges
  const isUrgent = minutesUntil !== null && minutesUntil <= 60 && minutesUntil > 0;
  const isCritical = minutesUntil !== null && minutesUntil <= 15 && minutesUntil > 0;
  const isOverdue = minutesUntil !== null && minutesUntil < 0;
  
  // Subtle status indicators
  const getTimeStatus = () => {
    if (!appointmentTime) return { color: 'text-white/40', bg: 'bg-white/5', label: 'No time' };
    
    if (isOverdue) return { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Overdue' };
    if (isCritical) return { color: 'text-red-500', bg: 'bg-red-500/15', label: 'Critical' };
    if (isUrgent) return { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Soon' };
    
    return { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Scheduled' };
  };
  
  const timeStatus = getTimeStatus();
  
  // Touch handlers for iOS-native swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;
    
    // Show actions if swiped left significantly
    if (diff > 60) {
      setIsSwipeOpen(true);
    } else if (diff < -20) {
      setIsSwipeOpen(false);
    }
  };
  
  const handleTouchEnd = () => {
    setTouchStart(null);
  };
  
  return (
    <div className="relative overflow-hidden group">
      {/* Main card with iOS-native styling */}
      <div 
        className={cn(
          // Base glassmorphism styling
          "bg-white/8 backdrop-blur-xl border border-white/10 rounded-2xl p-4",
          "transition-all duration-300 cursor-pointer",
          // iOS-native hover and active states
          "hover:bg-white/12 hover:border-white/20 hover:shadow-lg hover:shadow-black/25",
          "active:scale-[0.98] active:bg-white/6 active:transition-all active:duration-150",
          // Enhanced touch targets for mobile (minimum 44px)
          "min-h-[88px]",
          // Verification status styling
          lead.setterVerified && "border-green-400/30 bg-green-500/5",
          // Time-based styling without aggressive badges
          isUrgent && "border-orange-400/20",
          isCritical && "border-red-400/20",
          isOverdue && "border-red-500/20 bg-red-500/5",
          // Swipe animation
          isSwipeOpen && "transform -translate-x-24 md:-translate-x-20"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onLeadClick(lead)}
      >
        {/* Subtle status indicators in top right */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            timeStatus.color.replace('text-', 'bg-')
          )} />
          {lead.setterVerified && (
            <div className="w-3 h-3 rounded-full bg-green-400/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            </div>
          )}
        </div>
        
        {/* Customer information */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white/80" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg leading-tight truncate">
              {lead.customerName}
            </h3>
            <p className="text-white/60 text-sm truncate">
              {lead.customerPhone}
            </p>
            {lead.address && (
              <p className="text-white/50 text-xs truncate mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {lead.address}
              </p>
            )}
          </div>
        </div>
        
        {/* Consolidated time display - single elegant format */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl",
              timeStatus.bg
            )}>
              <Clock className={cn("w-4 h-4", timeStatus.color)} />
              <div>
                <div className={cn("text-sm font-medium", timeStatus.color)}>
                  {appointmentTime ? format(appointmentTime, "h:mm a") : "No time"}
                </div>
                <div className="text-xs text-white/50">
                  {appointmentTime ? format(appointmentTime, "MMM d") : "Not scheduled"}
                </div>
              </div>
            </div>
          </div>
          
          {/* Verification with contextual actions */}
          <div className="flex items-center gap-2">
            <VerifiedCheckbox 
              leadId={lead.id}
              variant="compact"
              className="scale-90"
            />
            <span className={cn(
              "text-xs font-medium",
              lead.setterVerified ? "text-green-400" : "text-orange-400"
            )}>
              {lead.setterVerified ? "Verified" : "Verify"}
            </span>
          </div>
        </div>
        
        {/* Setter information */}
        {lead.setterName && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <User className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/60">
              Set by: {lead.setterName}
            </span>
          </div>
        )}
      </div>
      
      {/* iOS-native swipe actions */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 flex items-center gap-2 px-3",
        "transition-all duration-300",
        isSwipeOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
      )}>
        {/* Call action */}
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "w-12 h-12 rounded-2xl p-0 transition-all duration-200",
            "bg-green-500 hover:bg-green-600 border-0",
            "text-white",
            "active:scale-95 shadow-lg shadow-green-500/25"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onCall(lead);
            setIsSwipeOpen(false);
          }}
        >
          <Phone className="w-5 h-5" />
        </Button>
        
        {/* Update Lead action */}
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "w-12 h-12 rounded-2xl p-0 transition-all duration-200",
            "bg-blue-500 hover:bg-blue-600 border-0",
            "text-white",
            "active:scale-95 shadow-lg shadow-blue-500/25"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onReschedule(lead);
            setIsSwipeOpen(false);
          }}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        
        {/* Complete action */}
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "w-12 h-12 rounded-2xl p-0 transition-all duration-200",
            "bg-purple-500 hover:bg-purple-600 border-0",
            "text-white",
            "active:scale-95 shadow-lg shadow-purple-500/25"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onComplete(lead);
            setIsSwipeOpen(false);
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default function ScheduledLeadsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [allScheduledLeads, setAllScheduledLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDispositionModal, setShowDispositionModal] = useState(false);

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

  // Date navigation helpers
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  // Action handlers with iOS-native patterns
  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  }, []);

  const handleCall = useCallback((lead: Lead) => {
    // iOS-native tel: scheme
    window.open(`tel:${lead.customerPhone}`);
    toast({
      title: "Calling",
      description: `Calling ${lead.customerName}`,
    });
  }, [toast]);

  const handleReschedule = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setShowDispositionModal(true);
  }, []);

  const handleComplete = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setShowDispositionModal(true);
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
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
    <div className="space-y-6">
      {/* Enhanced Header with iOS-native styling */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Scheduled Leads</h2>
            <p className="text-sm text-white/60">
              {filteredLeads.length} appointment{filteredLeads.length !== 1 ? 's' : ''} for {getDateLabel(selectedDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-first Date Navigation */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          {/* Previous day */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="w-10 h-10 rounded-full p-0 hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </Button>
          
          {/* Current date display */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">
                {getDateLabel(selectedDate)}
              </div>
              <div className="text-xs text-white/60">
                {format(selectedDate, "EEEE, MMM d")}
              </div>
            </div>
            
            {/* Calendar picker */}
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full p-0 hover:bg-white/10 active:scale-95 transition-all"
                >
                  <CalendarDays className="w-5 h-5 text-white/80" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-2xl" align="end" style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                background: 'rgba(255, 255, 255, 0.98)',
                borderColor: 'rgba(0, 0, 0, 0.15)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)',
              }}>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setShowCalendar(false);
                    }
                  }}
                  className="scheduled-leads-calendar"
                  classNames={{
                    day_selected: "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !bg-opacity-100 shadow-lg border-2 border-blue-400"
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Next day */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate('next')}
            className="w-10 h-10 rounded-full p-0 hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white/80" />
          </Button>
        </div>
        
        {/* Quick date navigation */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={isToday(selectedDate) ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="rounded-full text-xs px-4 h-8 active:scale-95 transition-all"
          >
            Today
          </Button>
          <Button
            variant={isTomorrow(selectedDate) ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedDate(addDays(new Date(), 1))}
            className="rounded-full text-xs px-4 h-8 active:scale-95 transition-all"
          >
            Tomorrow
          </Button>
        </div>
      </div>

      {/* Enhanced Leads List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/60 text-lg font-medium">No appointments</p>
              <p className="text-white/40 text-sm">
                No leads scheduled for {getDateLabel(selectedDate)}
              </p>
            </div>
          ) : (
            <>
              {/* Unverified Leads Section - Higher priority */}
              {unverifiedLeads.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <h3 className="text-sm font-medium text-orange-400 uppercase tracking-wide">
                      Needs Verification ({unverifiedLeads.length})
                    </h3>
                  </div>
                  {unverifiedLeads.map((lead) => (
                    <EnhancedLeadCard
                      key={lead.id}
                      lead={lead}
                      onLeadClick={handleLeadClick}
                      onCall={handleCall}
                      onReschedule={handleReschedule}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}

              {/* Verified Leads Section */}
              {verifiedLeads.length > 0 && (
                <div className="space-y-3">
                  {unverifiedLeads.length > 0 && (
                    <div className="flex items-center gap-2 px-1 mt-8">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <h3 className="text-sm font-medium text-green-400 uppercase tracking-wide">
                        Verified ({verifiedLeads.length})
                      </h3>
                    </div>
                  )}
                  {verifiedLeads.map((lead) => (
                    <EnhancedLeadCard
                      key={lead.id}
                      lead={lead}
                      onLeadClick={handleLeadClick}
                      onCall={handleCall}
                      onReschedule={handleReschedule}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Lead Details Dialog */}
      {selectedLead && showLeadDetails && (
        <Dialog open={showLeadDetails} onOpenChange={setShowLeadDetails}>
          <DialogContent className="sm:max-w-[600px] bg-black/80 backdrop-blur-xl border border-white/20 text-white shadow-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-xl font-bold text-white">
                Lead Details
              </DialogTitle>
              <DialogDescription className="text-white/60">
                View and manage lead information
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-white/60">Customer</p>
                  <p className="font-medium text-white">{selectedLead.customerName}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-white/60">Phone</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{selectedLead.customerPhone}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCall(selectedLead)}
                      className="w-8 h-8 p-0 rounded-full hover:bg-green-500/20 active:scale-95 transition-all"
                    >
                      <Phone className="w-4 h-4 text-green-400" />
                    </Button>
                  </div>
                </div>
                
                {selectedLead.address && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-sm text-white/60">Address</p>
                    <p className="font-medium text-white">{selectedLead.address}</p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm text-white/60">Scheduled Time</p>
                  <p className="font-medium text-white">
                    {selectedLead.scheduledAppointmentTime ? 
                      format(selectedLead.scheduledAppointmentTime.toDate(), "MMM d, yyyy 'at' h:mm a") : 
                      "Not scheduled"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-white/60">Setter</p>
                  <p className="font-medium text-white">{selectedLead.setterName || "Unknown"}</p>
                </div>
                
                <div className="col-span-2 space-y-1">
                  <p className="text-sm text-white/60">Verification Status</p>
                  <div className="flex items-center gap-2">
                    <VerifiedCheckbox leadId={selectedLead.id} variant="standard" />
                    <p className="font-medium text-white">
                      {selectedLead.setterVerified ? "Verified" : "Not Verified"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* iOS-native action buttons with color fill */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleCall(selectedLead)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0 active:scale-95 transition-all shadow-lg shadow-green-500/25"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button
                  onClick={() => {
                    setShowLeadDetails(false);
                    handleReschedule(selectedLead);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0 active:scale-95 transition-all shadow-lg shadow-blue-500/25"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Update Lead
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Lead Disposition Modal */}
      {selectedLead && showDispositionModal && (
        <LeadDispositionModal
          lead={selectedLead}
          isOpen={showDispositionModal}
          onClose={() => {
            setShowDispositionModal(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}

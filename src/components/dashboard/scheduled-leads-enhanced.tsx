"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
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
          // Clean iOS-native styling - minimal background
          "bg-white/5 dark:bg-gray-800/20 border border-gray-200/20 dark:border-gray-700/30 rounded-2xl p-4",
          "transition-all duration-300 cursor-pointer",
          // iOS-native hover and active states
          "hover:bg-white/10 dark:hover:bg-gray-800/30 hover:border-gray-200/30 dark:hover:border-gray-700/40 hover:shadow-sm",
          "active:scale-[0.98] active:bg-white/5 dark:active:bg-gray-800/15 active:transition-all active:duration-150",
          // Enhanced touch targets for mobile (minimum 44px)
          "min-h-[88px]",
          // Verification status styling - subtle
          lead.setterVerified && "border-green-400/40 bg-green-500/5",
          // Time-based styling - clean and minimal
          isUrgent && "border-orange-400/30",
          isCritical && "border-red-400/30",
          isOverdue && "border-red-500/30 bg-red-500/5",
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
            <User className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg leading-tight truncate">
              {lead.customerName}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm truncate">
              {lead.customerPhone}
            </p>
            {lead.address && (
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5 flex items-center gap-1">
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
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <User className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
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
  const haptic = useHapticFeedback();
  
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
    <div className="space-y-0">
      {/* Simplified iOS-Native Date Navigation */}
      <div className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/30">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scheduled Leads
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredLeads.length} appointment{filteredLeads.length !== 1 ? 's' : ''} for {format(selectedDate, 'EEEE, MMM d')}
          </p>
        </div>

        {/* Simplified Date Navigation */}
        <div className="flex items-center justify-between px-4 pb-4">
          {/* Previous Day Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigateDate('prev');
              haptic.light();
            }}
            className="w-10 h-10 rounded-full p-0 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>

          {/* Current Date Display */}
          <div className="flex-1 text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {isToday(selectedDate) ? (
                <span className="text-blue-500">Today</span>
              ) : isTomorrow(selectedDate) ? (
                <span className="text-blue-500">Tomorrow</span>
              ) : (
                format(selectedDate, 'MMM d, yyyy')
              )}
            </div>
            {!isToday(selectedDate) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {format(selectedDate, 'EEEE')}
              </div>
            )}
          </div>

          {/* Date Picker and Next Day Button */}
          <div className="flex items-center gap-2">
            {/* Calendar Icon for Date Picker */}
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full p-0 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 active:scale-95 transition-all"
                  onClick={() => haptic.light()}
                >
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
                      haptic.medium();
                    }
                  }}
                  initialFocus
                  className="rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </PopoverContent>
            </Popover>

            {/* Next Day Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigateDate('next');
                haptic.light();
              }}
              className="w-10 h-10 rounded-full p-0 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="px-4 py-6">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No appointments</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              for {format(selectedDate, 'EEEE, MMMM d')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unverified Leads Section - Higher priority */}
            {unverifiedLeads.length > 0 && (
              <>
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
              </>
            )}

            {/* Verified Leads Section */}
            {verifiedLeads.length > 0 && (
              <>
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
              </>
            )}
          </div>
        )}
      </div>

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

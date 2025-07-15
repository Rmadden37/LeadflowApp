"use client";

import React from "react";
import type {Lead, LeadStatus,Closer} from "@/types";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {useToast} from "@/hooks/use-toast";
import {useAuth} from "@/hooks/use-auth";
import {useHapticFeedback} from "@/utils/haptic";
import {db} from "@/lib/firebase";
import {doc, updateDoc, serverTimestamp, Timestamp, collection, query, where, onSnapshot} from "firebase/firestore";
import {useState, useEffect} from "react";
import {Loader2} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { LeadNotifications } from "@/lib/notification-service";
import {useRouter} from "next/navigation";

interface LeadDispositionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const dispositionOptions: LeadStatus[] = [
  "sold",
  "no_sale", 
  "canceled",
  "rescheduled",
  "credit_fail",
  "waiting_assignment", // Allow managers to reassign leads - Reassign Closer option
];

// Time picker: 8am to 10pm in 30-minute increments
const timeSlots = (() => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    // Add :00 slot
    const hour12 = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour12 === 0 ? 12 : hour12;
    
    slots.push({
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${displayHour}:00 ${ampm}`
    });
    
    // Add :30 slot (except for 10:30 PM to keep it until 10 PM)
    if (hour < 22) {
      slots.push({
        value: `${hour.toString().padStart(2, '0')}:30`,
        label: `${displayHour}:30 ${ampm}`
      });
    }
  }
  return slots;
})();

const LeadDispositionModal: React.FC<LeadDispositionModalProps> = ({lead, isOpen, onClose}) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {toast} = useToast();
  const {user} = useAuth();
  const haptic = useHapticFeedback();
  const router = useRouter();

  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState<string>("17:00"); // Default to 5:00 PM

  // State for available closers when reassigning
  const [availableClosers, setAvailableClosers] = useState<Closer[]>([]);
  const [selectedCloserId, setSelectedCloserId] = useState<string | undefined>(undefined);
  const [loadingClosers, setLoadingClosers] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentTime("17:00");
      setSelectedCloserId(undefined);
    }
  }, [isOpen]);

  // Filter disposition options based on user role and current lead status
  const getAvailableDispositionOptions = () => {
    if (user?.role === "manager" || user?.role === "admin") {
      // Managers/admins can set any disposition, including reassignment
      return dispositionOptions;
    } else {
      // Closers cannot set leads back to waiting_assignment
      return dispositionOptions.filter(option => option !== "waiting_assignment");
    }
  };

  const availableOptions = getAvailableDispositionOptions();

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(undefined);
      setNotes("");
      setAppointmentDate(undefined);
      setAppointmentTime("17:00"); // Default to 5:00 PM
      setSelectedCloserId(undefined);
      setAvailableClosers([]);
    }
    return undefined;
  }, [isOpen]);

  // Load available closers when "Reassign Closer" is selected
  useEffect(() => {
    if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && user?.teamId) {
      setLoadingClosers(true);
      
      const closersQuery = query(
        collection(db, "closers"),
        where("teamId", "==", user.teamId),
        where("status", "==", "On Duty")
      );

      const unsubscribe = onSnapshot(closersQuery, (querySnapshot: { docs: { data: () => any; id: any; }[]; }) => {
        const closersData = querySnapshot.docs.map((doc: { data: () => any; id: any; }) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: data.name,
            status: data.status as "On Duty" | "Off Duty",
            teamId: data.teamId,
            role: data.role,
            avatarUrl: data.avatarUrl,
          };
        });
        setAvailableClosers(closersData);
        setLoadingClosers(false);
      }, () => {
        setAvailableClosers([]);
        setLoadingClosers(false);
      });

      return () => unsubscribe();
    } else {
      setAvailableClosers([]);
      setSelectedCloserId(undefined);
    }
    return undefined;
  }, [selectedStatus, user?.role, user?.teamId, lead.assignedCloserId, toast]);

  const handleSubmit = async () => {
    if (!selectedStatus) {
      haptic.formError();
      toast({
        title: "No Status Selected",
        description: "Please select a disposition status.",
        variant: "destructive",
      });
      return;
    }

    // If reassigning to a specific closer, validate selection
    if (selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && availableClosers.length > 0 && !selectedCloserId) {
      haptic.formError();
      toast({
        title: "No Closer Selected",
        description: "Please select a closer to reassign this lead to.",
        variant: "destructive",
      });
      return;
    }

    let scheduledTimestamp: Timestamp | undefined = undefined;
    if (selectedStatus === "rescheduled" || selectedStatus === "scheduled") {
      if (!appointmentDate || !appointmentTime) {
        haptic.formError();
        toast({
          title: "Missing Appointment Time",
          description: "Please select a date and time for the appointment.",
          variant: "destructive",
        });
        return;
      }
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      // Create date in local timezone to avoid UTC conversion issues
      const combinedDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');

      if (combinedDateTime <= new Date()) {
        haptic.formError();
        toast({
          title: "Invalid Appointment Time",
          description: "Scheduled appointment time must be in the future.",
          variant: "destructive",
        });
        return;
      }
      scheduledTimestamp = Timestamp.fromDate(combinedDateTime);
    }

    setIsLoading(true);
    try {
      const leadDocRef = doc(db, "leads", lead.id);
      const updateData: Record<string, any> = {
        status: selectedStatus,
        dispositionNotes: notes,
        updatedAt: serverTimestamp(),
      };

      if ((selectedStatus === "rescheduled" || selectedStatus === "scheduled") && scheduledTimestamp) {
        updateData.scheduledAppointmentTime = scheduledTimestamp;
      } else {
        // Clear scheduled time if not rescheduled/scheduled or if it was previously and now something else
        updateData.scheduledAppointmentTime = null;
      }

      // Handle reassignment logic
      let reassignedCloser: Closer | undefined = undefined;
      if (selectedStatus === "waiting_assignment") {
        if (selectedCloserId && (user?.role === "manager" || user?.role === "admin")) {
          // Assign to specific closer
          const selectedCloser = availableClosers.find(c => c.uid === selectedCloserId);
          if (selectedCloser) {
            updateData.assignedCloserId = selectedCloser.uid;
            updateData.assignedCloserName = selectedCloser.name;
            reassignedCloser = selectedCloser;
            // Keep status as waiting_assignment so closer can accept
          }
        } else {
          // Move to general assignment queue
          updateData.assignedCloserId = null;
          updateData.assignedCloserName = null;
        }
      }

      await updateDoc(leadDocRef, updateData);

      // Send notification if reassigned to a closer
      if (reassignedCloser) {
        await LeadNotifications.leadAssigned(
          { ...lead, ...updateData, id: lead.id },
          reassignedCloser.uid
        );
      }

      const successMessage = selectedStatus === "waiting_assignment" && selectedCloserId 
        ? `Lead reassigned to ${availableClosers.find(c => c.uid === selectedCloserId)?.name}.`
        : `Lead marked as ${selectedStatus.replace("_", " ")}.`;
        
      haptic.formSubmit();
      toast({
        title: "Disposition Updated",
        description: successMessage,
      });
      
      onClose();
      
      // Navigate to dashboard after successful disposition save
      router.push("/dashboard");
    } catch {
      haptic.formError();
      toast({
        title: "Update Failed",
        description: "Could not update lead disposition.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className={cn(
        // 🌟 PREMIUM iOS MODAL STYLING - Solid, Non-Transparent
        "manager-disposition-modal sm:max-w-md max-w-[95vw]",
        // 📱 IMPROVED VIEWPORT HANDLING - Better support for iPad and mobile
        "max-h-[85vh] md:max-h-[90vh] overflow-y-auto",
        // 🎯 ENHANCED POSITIONING - Optimized for iPad/tablet devices
        "fixed inset-x-4 top-[8%] md:top-[50%] md:left-[50%] md:translate-x-[-50%] md:translate-y-[-50%]",
        // 🔧 Safe area accounting for mobile devices with increased nav height
        "bottom-auto",
        "bg-white dark:bg-gray-900 border-0",
        "shadow-2xl shadow-black/50",
        "rounded-3xl p-0",
        
        // ✨ iOS DEPTH & LAYERING - Proper Z-Index Management  
        "relative z-50",
        "backdrop-blur-none", // Remove transparency conflicts
        
        // 🎨 iOS NATIVE APPEARANCE
        "before:absolute before:inset-0 before:rounded-3xl",
        "before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none"
      )}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {(user?.role === "manager" || user?.role === "admin") ? "Manager Disposition" : "Update Lead Disposition"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
              {(user?.role === "manager" || user?.role === "admin")
                ? `Set the status for lead: ${lead.customerName}. As a manager/admin, you can set any disposition or reassign the lead.`
                : `Select the outcome for lead: ${lead.customerName}.`
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 📱 MAIN CONTENT - iOS Settings Style Container */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid gap-4">{/* Content will go here */}</div>
          <RadioGroup 
            onValueChange={(value) => {
              haptic.listItemSelect();
              setSelectedStatus(value as LeadStatus);
            }} 
            value={selectedStatus}
            className="space-y-2"
          >
            {availableOptions.map((status) => (
              <div 
                key={status} 
                className={cn(
                  "flex items-center space-x-3 rounded-lg p-4 transition-all duration-200 cursor-pointer min-h-[44px]",
                  "frosted-glass-card border border-[var(--glass-border)]",
                  "hover:bg-white/10 hover:border-[var(--accent-light)]/50",
                  "active:scale-[0.98] ios-touch-feedback manager-disposition-option",
                  status === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") 
                    ? "bg-amber-500/10 border-amber-400/30 hover:bg-amber-500/20" 
                    : "",
                  status === "sold" 
                    ? "bg-green-500/10 border-green-400/30 hover:bg-green-500/20"
                    : "",
                  selectedStatus === status 
                    ? status === "sold" 
                      ? "bg-green-500/20 border-green-400/60 shadow-lg shadow-green-500/20"
                      : status === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin")
                        ? "bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/20"
                        : "bg-[var(--accent-light)]/10 border-[var(--accent-light)]/60 shadow-lg"
                    : ""
                )}
                data-state={selectedStatus === status ? "checked" : "unchecked"}
                onClick={() => setSelectedStatus(status as LeadStatus)}
              >
                <RadioGroupItem 
                  value={status} 
                  id={`status-${status}`} 
                  className={cn(
                    "h-5 w-5",
                    status === "sold" 
                      ? "border-green-400 text-green-400 data-[state=checked]:border-green-400 data-[state=checked]:bg-green-400/20"
                      : "border-[var(--accent-light)] text-[var(--accent-light)] data-[state=checked]:border-[var(--accent-light)] data-[state=checked]:bg-[var(--accent-light)]/20",
                    "manager-disposition-radio"
                  )}
                />
                <Label 
                  htmlFor={`status-${status}`} 
                  className={cn(
                    "capitalize flex-1 cursor-pointer font-medium text-base leading-6",
                    status === "sold" ? "text-green-400" : "text-[var(--text-primary)]"
                  )}
                >
                  {status === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") ? (
                    <span className="font-medium text-amber-300">
                      Reassign Closer
                    </span>
                  ) : status === "sold" ? (
                    <span className="font-medium text-green-400">
                      Sold
                    </span>
                  ) : (
                    status.replace("_", " ")
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedStatus === "waiting_assignment" && (user?.role === "manager" || user?.role === "admin") && (
            <div className="space-y-3 frosted-glass-card p-4 bg-amber-500/10 border-amber-400/30">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                <Label className="text-sm font-medium text-amber-300">
                  Reassign to Available Closer
                </Label>
              </div>
              
              {loadingClosers ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span className="text-sm text-amber-300">Loading available closers...</span>
                </div>
              ) : availableClosers.length > 0 ? (
                <>
                  <p className="text-sm text-amber-300">
                    Select a closer to reassign this lead to, or leave unselected to move to general assignment queue.
                  </p>
                  <Select onValueChange={setSelectedCloserId} value={selectedCloserId}>
                    <SelectTrigger className="w-full bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/10">
                      <SelectValue placeholder="Select a closer (or leave blank for general queue)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--glass-bg)] backdrop-blur-[20px] border-[var(--glass-border)]">
                      {availableClosers.map((closer) => (
                        <SelectItem key={closer.uid} value={closer.uid} className="text-[var(--text-primary)] hover:bg-white/10">
                          {closer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <p className="text-sm text-amber-300">
                  No available closers found. This will move the lead to the general assignment queue.
                </p>
              )}
            </div>
          )}

          {selectedStatus === "rescheduled" && (
            <div className="space-y-3 frosted-glass-card p-3">
              <Label className="text-sm font-medium text-[var(--text-primary)]">Set Appointment Time</Label>
              <DatePicker
                date={appointmentDate}
                onDateChange={setAppointmentDate}
                placeholder="Pick a date"
                className="w-full bg-transparent border-[var(--glass-border)] text-[var(--text-primary)]"
              />
              <div className="w-full">
                <TimePicker
                  time={appointmentTime}
                  onTimeChange={(time) => setAppointmentTime(time ?? "17:00")}
                  placeholder="Select time"
                  timeSlots={timeSlots}
                />
              </div>
            </div>
          )}

          <Textarea
            placeholder="Add any relevant notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-light)]"
          />
        </div>
        {/* 🎯 ACTION BUTTONS - iOS Modal Footer Style */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className={cn(
                "flex-1 sm:flex-none h-11",
                "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                "text-gray-700 dark:text-gray-300",
                "hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !selectedStatus}
              className={cn(
                "flex-1 sm:flex-none h-11",
                "bg-[#007AFF] hover:bg-[#0056CC] border-0",
                "text-white font-semibold",
                "shadow-lg shadow-[#007AFF]/25"
              )}
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Disposition"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDispositionModal;

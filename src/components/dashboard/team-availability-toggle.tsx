"use client";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc} from "firebase/firestore";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {useState} from "react";
import {Loader2} from "lucide-react";
import type {AppUser} from "@/types";

interface TeamAvailabilityToggleProps {
  targetUser: AppUser;
  currentStatus?: "On Duty" | "Off Duty";
  disabled?: boolean;
}

export default function TeamAvailabilityToggle({
  targetUser, 
  currentStatus,
  disabled = false
}: TeamAvailabilityToggleProps) {
  const {user: currentUser} = useAuth();
  const {toast} = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Only managers/admins can toggle other users, or users can toggle themselves
  const canToggle = currentUser && (
    currentUser.role === "manager" || 
    currentUser.role === "admin" || 
    currentUser.uid === targetUser.uid
  );

  // Only show toggle for closers, managers, and admins
  const shouldShowToggle = targetUser.role === "closer" || 
                          targetUser.role === "manager" || 
                          targetUser.role === "admin";

  if (!canToggle || !shouldShowToggle) {
    return null;
  }

  const isOnDuty = currentStatus === "On Duty";

  const handleToggleAvailability = async (checked: boolean) => {
    if (!currentUser || disabled) return;
    
    setIsLoading(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      // Update the closer record
      const closerDocRef = doc(db, "closers", targetUser.uid);
      await updateDoc(closerDocRef, {
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `${targetUser.displayName || targetUser.email} is now ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Could not update ${targetUser.displayName || targetUser.email}'s status.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`team-availability-toggle-${targetUser.uid}`}
        checked={isOnDuty}
        onCheckedChange={handleToggleAvailability}
        disabled={isLoading || disabled}
        aria-label={isOnDuty ? `Set ${targetUser.displayName || targetUser.email} to Self-Gen` : `Set ${targetUser.displayName || targetUser.email} to On Duty`}
        className="scale-75"
      />
      <Label
        htmlFor={`team-availability-toggle-${targetUser.uid}`}
        className={`text-xs font-medium cursor-pointer ${
          isOnDuty ? "text-green-600" : "text-red-600"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            {isOnDuty ? "🟢 On Duty" : "🔴 Self-Gen"}
          </>
        )}
      </Label>
    </div>
  );
}

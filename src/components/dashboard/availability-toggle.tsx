
"use client";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, getDoc} from "firebase/firestore";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {useState, useEffect} from "react";

export default function AvailabilityToggle() {
  const {user} = useAuth(); // `user` here is AppUser (from `users` collection)
  const {toast} = useToast();

  const [isUIDuty, setIsUIDuty] = useState(false); // Default to false, will be updated from Firestore
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Effect to fetch initial status from 'closers' collection
  useEffect(() => {
    if (user?.uid && user.role === "closer") {
      const fetchCloserStatus = async () => {
        setIsLoading(true);
        // Assume document ID in 'closers' collection is the same as Firebase Auth UID
        const closerDocRef = doc(db, "closers", user.uid);
        try {
          const docSnap = await getDoc(closerDocRef);
          if (docSnap.exists()) {
            const closerData = docSnap.data();
            setIsUIDuty(closerData.status === "On Duty");
          } else {
            // If no document in 'closers', default to off duty
            setIsUIDuty(false);
            toast({
              title: "Profile Issue",
              description: "Closer profile not found. Please contact support.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "Connection Error",
            description: "Could not load status. Please refresh the page.",
            variant: "destructive",
          });
          setIsUIDuty(false); // Default to off-duty on error
        } finally {
          setIsLoading(false);
          setInitialLoadDone(true);
        }
      };
      fetchCloserStatus();
    }
  }, [user?.uid, user?.role, toast]);


  if (!user || user.role !== "closer" || !initialLoadDone) {
    // Don't render if not a closer or if initial status hasn't been loaded yet
    // to prevent toggle appearing in an incorrect initial state.
    return null;
  }

  const handleToggleAvailability = async (checked: boolean) => {
    if (!user?.uid) return;
    setIsLoading(true);
    setIsUIDuty(checked); // Optimistic update for UI

    const newFirestoreStatus = checked ? "On Duty" : "Off Duty";

    try {
      // Assume document ID in 'closers' collection is the same as Firebase Auth UID
      const closerDocRef = doc(db, "closers", user.uid);
      await updateDoc(closerDocRef, {
        status: newFirestoreStatus,
      });
      toast({
        title: "Status Updated",
        description: `You are now ${newFirestoreStatus}.`,
      });
    } catch {
      setIsUIDuty(!checked); // Revert optimistic update
      toast({
        title: "Update Failed",
        description: "Could not update your availability status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-sm">
      <Switch
        id="availability-toggle"
        checked={isUIDuty}
        onCheckedChange={handleToggleAvailability}
        disabled={isLoading}
        aria-label={isUIDuty ? "Set to Self-Gen" : "Set to On Duty"}
        className={`
          data-[state=checked]:bg-[#007AFF]
          shadow-lg hover:shadow-xl transition-all duration-300
          ${isUIDuty 
            ? 'shadow-green-400/50 dark:shadow-blue-500/50' 
            : 'shadow-red-400/50 dark:shadow-red-400/50'
          }
          scale-110 border-2
          ${isUIDuty 
            ? 'border-green-400 dark:border-blue-400' 
            : 'border-red-400 dark:border-red-400'
          }
        `}
      />
      <Label 
        htmlFor="availability-toggle" 
        className={`
          text-sm font-bold cursor-pointer transition-colors duration-300
          ${isUIDuty 
            ? "text-green-600 dark:text-blue-400 drop-shadow-sm" 
            : "text-red-600 dark:text-red-400 drop-shadow-sm"
          }
        `}
      >
        {isUIDuty ? "🟢 On Duty" : "🔴 Self-Gen"}
      </Label>
    </div>
  );
}


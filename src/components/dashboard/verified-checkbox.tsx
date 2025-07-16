"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { doc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VerifiedCheckboxProps {
  leadId: string;
  disabled?: boolean;
  className?: string;
  variant?: "compact" | "standard" | "enhanced";
}

export default function VerifiedCheckbox({ 
  leadId, 
  disabled = false, 
  className = "",
  variant = "standard"
}: VerifiedCheckboxProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real-time sync of verification status
  useEffect(() => {
    if (!leadId) return;

    const leadRef = doc(db, "leads", leadId);
    const unsubscribe = onSnapshot(leadRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const verified = data.setterVerified === true || data.isVerified === true;
        setIsVerified(verified);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [leadId]);

  const handleVerificationChange = async (checked: boolean, event?: React.MouseEvent) => {
    // CRITICAL: Stop event propagation to prevent activating parent click handlers
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!user || isUpdating || disabled) return;

    // iOS-style haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(checked ? [10, 50, 10] : [20]);
    }

    setIsUpdating(true);
    try {
      const leadRef = doc(db, "leads", leadId);
      
      await updateDoc(leadRef, {
        setterVerified: checked,
        isVerified: checked,
        verifiedAt: checked ? serverTimestamp() : null,
        verifiedBy: checked ? user.uid : null,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: checked ? "Lead Verified" : "Verification Removed",
        description: checked ? "Lead has been marked as verified." : "Lead verification has been removed.",
      });
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Update Failed",
        description: "Could not update verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // iOS-compliant touch target sizes with enhanced prominence
  const getSizeClasses = () => {
    switch (variant) {
      case "compact":
        return {
          container: "min-h-[52px] min-w-[52px] p-2.5",
          icon: "h-6 w-6",
          checkbox: "h-6 w-6",
          text: "text-xs"
        };
      case "enhanced":
        return {
          container: "min-h-[64px] min-w-[64px] p-4",
          icon: "h-8 w-8",
          checkbox: "h-8 w-8",
          text: "text-sm"
        };
      default: // standard
        return {
          container: "min-h-[58px] min-w-[58px] p-3.5",
          icon: "h-7 w-7",
          checkbox: "h-7 w-7",
          text: "text-sm"
        };
    }
  };

  const sizes = getSizeClasses();

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-full touch-manipulation transition-all duration-200",
        "shadow-lg ring-2 ring-white/20 backdrop-blur-md border-2", // Enhanced loading state visibility
        "bg-gradient-to-br from-gray-500/20 via-gray-500/15 to-gray-500/10 border-gray-400/40",
        sizes.container,
        className
      )}>
        <Loader2 className={cn(sizes.icon, "animate-spin text-gray-300")} />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer",
        "touch-manipulation select-none shadow-lg", // iOS optimization with enhanced shadow
        "hover:bg-white/15 active:bg-white/25 active:scale-95", // Enhanced iOS-style feedback
        "ring-2 ring-white/20 hover:ring-white/30", // Prominent ring for visibility
        // Enhanced glassmorphism styling
        "backdrop-blur-md border-2",
        sizes.container,
        disabled && "opacity-50 cursor-not-allowed",
        isUpdating && "animate-pulse",
        // Enhanced status-based styling with stronger contrast
        isVerified && [
          "bg-gradient-to-br from-green-500/30 via-green-500/20 to-green-500/10",
          "hover:from-green-500/40 hover:via-green-500/30 hover:to-green-500/20",
          "ring-green-400/50 hover:ring-green-400/70 border-green-400/50"
        ],
        !isVerified && [
          "bg-gradient-to-br from-gray-500/20 via-gray-500/15 to-gray-500/10",
          "hover:from-gray-500/30 hover:via-gray-500/25 hover:to-gray-500/20",
          "ring-gray-400/40 hover:ring-gray-400/60 border-gray-400/40"
        ],
        className
      )}
      onClick={(event) => {
        // CRITICAL: Always stop propagation
        event.preventDefault();
        event.stopPropagation();
        
        if (!disabled && !isUpdating) {
          handleVerificationChange(!isVerified, event);
        }
      }}
      onTouchStart={(event) => {
        // Prevent iOS from adding touch highlights and delays
        event.stopPropagation();
      }}
      title={
        disabled 
          ? (isVerified ? "Verified" : "Not Verified")
          : (isVerified ? "Click to remove verification" : "Click to verify lead")
      }
      role="button"
      aria-label={isVerified ? "Remove verification" : "Verify lead"}
      aria-pressed={isVerified}
    >
      {isVerified ? (
        <CheckCircle2 className={cn(
          sizes.icon, 
          "text-green-300 flex-shrink-0 transition-colors duration-200 drop-shadow-md",
          "filter brightness-110" // Enhanced brightness for visibility
        )} />
      ) : (
        <div className={cn(
          "border-3 border-gray-200 rounded-lg flex items-center justify-center transition-all duration-200",
          "hover:border-blue-300 focus:border-blue-400 shadow-inner bg-white/10",
          sizes.checkbox,
          isUpdating && "border-blue-300"
        )}>
          {isUpdating && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-300" />
          )}
        </div>
      )}
    </div>
  );
}
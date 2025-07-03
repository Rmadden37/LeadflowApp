"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { doc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface VerifiedCheckboxProps {
  leadId: string;
  disabled?: boolean;
  className?: string;
}

export default function VerifiedCheckbox({ leadId, disabled = false, className = "" }: VerifiedCheckboxProps) {
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

  const handleVerificationChange = async (checked: boolean) => {
    if (!user || isUpdating || disabled) return;

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

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {isVerified ? (
        <div 
          className={`${disabled || isUpdating ? 'opacity-50' : 'cursor-pointer'}`}
          onClick={() => !disabled && !isUpdating && handleVerificationChange(false)}
          title={disabled ? "Verified" : "Click to remove verification"}
        >
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
        </div>
      ) : (
        <Checkbox
          checked={false}
          disabled={disabled || isUpdating}
          onCheckedChange={(checked) => handleVerificationChange(checked as boolean)}
          className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0"
        />
      )}
    </div>
  );
}
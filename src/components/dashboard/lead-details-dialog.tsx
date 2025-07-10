
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Lead } from "@/types";
import LeadCard from "./lead-card";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose?: () => void;
  context?: "queue-waiting" | "queue-scheduled" | "in-process" | "all-leads";
}

export default function LeadDetailsDialog({
  lead,
  isOpen,
  onClose,
  context = "in-process",
}: LeadDetailsDialogProps) {
  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">
            Lead Details
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            View and manage lead information
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <LeadCard 
            lead={lead} 
            context={context} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

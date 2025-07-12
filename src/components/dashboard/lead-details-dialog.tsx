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
import LeadDispositionModal from "./lead-disposition-modal";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
  const [isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);

  if (!lead) return null;

  // Check if user can disposition this lead
  const canDisposition = 
    (user?.role === "closer" && (lead.status === "in_process" || lead.status === "accepted")) ||
    ((user?.role === "manager" || user?.role === "admin"));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">
              Lead Details - {lead.customerName}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              {context === "queue-waiting" && "Waiting for assignment"}
              {context === "queue-scheduled" && "Scheduled appointment"}
              {context === "in-process" && "Currently being worked"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <LeadCard 
              lead={lead} 
              context={context} 
            />
          </div>

          {/* Add disposition button for waiting/scheduled leads */}
          {canDisposition && (context === "queue-waiting" || context === "queue-scheduled") && (
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--glass-border)]">
              <Button
                variant="outline"
                onClick={() => setIsDispositionModalOpen(true)}
                className="bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/10"
              >
                Update Disposition
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disposition Modal */}
      {canDisposition && (
        <LeadDispositionModal
          lead={lead}
          isOpen={isDispositionModalOpen}
          onClose={() => setIsDispositionModalOpen(false)}
        />
      )}
    </>
  );
}
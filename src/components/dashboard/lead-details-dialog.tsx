
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types";
import { format } from "date-fns";
import { X, User, Phone, MapPin, Calendar, UserCheck, Clock, Building } from "lucide-react";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadDetailsDialog({
  lead,
  isOpen,
  onClose,
}: LeadDetailsDialogProps) {
  if (!lead) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting_assignment':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'scheduled':
        return 'text-blue-400 bg-blue-400/20';
      case 'in_process':
        return 'text-green-400 bg-green-400/20';
      case 'completed':
        return 'text-emerald-400 bg-emerald-400/20';
      case 'canceled':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--accent-light)]" />
              {lead.customerName}
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription className="text-[var(--text-secondary)]">
            Lead information and appointment details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm text-[var(--text-secondary)]">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
              {formatStatus(lead.status)}
            </span>
          </div>

          {/* Contact Information */}
          <div className="frosted-glass-card p-3 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Contact Information</h3>
            
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[var(--accent-light)] flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--text-secondary)]">Phone</p>
                <p className="text-sm text-[var(--text-primary)]">{lead.customerPhone}</p>
              </div>
            </div>

            {lead.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[var(--accent-light)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Address</p>
                  <p className="text-sm text-[var(--text-primary)]">{lead.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Appointment Information */}
          {lead.scheduledAppointmentTime && (
            <div className="frosted-glass-card p-3 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Appointment Details</h3>
              
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[var(--accent-light)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Scheduled Time</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {format(lead.scheduledAppointmentTime.toDate(), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Team Information */}
          <div className="frosted-glass-card p-3 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Team Assignment</h3>
            
            {lead.setterName && (
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-[var(--accent-light)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Setter</p>
                  <p className="text-sm text-[var(--text-primary)]">{lead.setterName}</p>
                </div>
              </div>
            )}

            {lead.assignedCloserName && (
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-[var(--accent-light)] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Assigned Closer</p>
                  <p className="text-sm text-[var(--text-primary)]">{lead.assignedCloserName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Created Information */}
          {lead.createdAt && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Clock className="w-3 h-3" />
              Created {format(lead.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={onClose} 
            variant="outline"
            className="bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

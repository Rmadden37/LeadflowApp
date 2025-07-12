"use client";

import type {Lead} from "@/types";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Ban,
  CalendarClock,
  CreditCard,
  User as UserIcon,
  Phone,
  Clock,
  ClipboardList,
  MapPin,
  Mail,
  ImageIcon,
  ArrowDown,
  Ghost,
} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {useState} from "react";
import LeadDispositionModal from "./lead-disposition-modal";
import dynamic from 'next/dynamic';

// Use dynamic import for the photo gallery to reduce initial bundle size
const LeadPhotoGallery = dynamic(
  () => import("./lead-photo-gallery"),
  { 
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false // Disable server-side rendering for this component
  }
);
import VerifiedCheckbox from "./verified-checkbox";
import {Badge} from "@/components/ui/badge";
import {formatDistanceToNow, format as formatDate} from "date-fns";


interface LeadCardProps {
  lead: Lead;
  context?: "in-process" | "queue-waiting" | "queue-scheduled" | "all-leads";
  onLeadClick?: (lead: Lead) => void;
}

const getStatusIcon = (status: Lead["status"]) => {
  switch (status) {
    case "in_process":
      return <Ghost className="h-4 w-4 text-white stroke-2" fill="none" stroke="currentColor" strokeWidth={2} />;
    case "accepted":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "sold":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "no_sale":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "canceled":
      return <Ban className="h-4 w-4 text-yellow-500" />;
    case "rescheduled":
      return <CalendarClock className="h-4 w-4 text-purple-500" />;
    case "scheduled":
      return <CalendarClock className="h-4 w-4 text-blue-500" />;
    case "credit_fail":
      return <CreditCard className="h-4 w-4 text-blue-500" />;
    case "waiting_assignment":
      return <ClipboardList className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

const getStatusVariant = (status: Lead["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
  case "sold": return "default";
  case "accepted": return "secondary";
  case "in_process": return "secondary";
  case "no_sale":
  case "credit_fail":
  case "canceled":
    return "destructive";
  case "waiting_assignment":
  case "rescheduled":
  case "scheduled":
    return "outline";
  default: return "outline";
  }
};

const getStatusColor = (status: Lead["status"]) => {
  switch (status.toLowerCase()) {
    case 'waiting_assignment':
      return 'text-yellow-400 bg-yellow-400/20';
    case 'scheduled':
      return 'text-blue-400 bg-blue-400/20';
    case 'in_process':
      return 'text-green-400 bg-green-400/20';
    case 'accepted':
      return 'text-green-400 bg-green-400/20';
    case 'sold':
      return 'text-emerald-400 bg-emerald-400/20';
    case 'no_sale':
      return 'text-red-400 bg-red-400/20';
    case 'canceled':
      return 'text-red-400 bg-red-400/20';
    case 'rescheduled':
      return 'text-purple-400 bg-purple-400/20';
    case 'credit_fail':
      return 'text-orange-400 bg-orange-400/20';
    default:
      return 'text-gray-400 bg-gray-400/20';
  }
};


export default function LeadCard({lead, context = "in-process", onLeadClick}: LeadCardProps) {
    const {user} = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);

  // Allow any closer to disposition leads that are accepted or in process, not just assigned closers
  // Also allow managers/admins to disposition any lead when viewing all leads or in-process leads
  // Allow managers to disposition scheduled and waiting leads too
  const canUpdateDisposition = 
    (user?.role === "closer" && (lead.status === "in_process" || lead.status === "accepted")) ||
    ((user?.role === "manager" || user?.role === "admin") && (context === "all-leads" || context === "in-process" || context === "queue-scheduled" || context === "queue-waiting"));

  const timeCreatedAgo = lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate(), {addSuffix: true}) : "N/A";

  const scheduledTimeDisplay = (lead.status === "rescheduled" || lead.status === "scheduled") && lead.scheduledAppointmentTime ?
    formatDate(lead.scheduledAppointmentTime.toDate(), "MMM d, p") :
    null;

  // Compact display for scheduled leads in the queue
  if (context === "queue-scheduled") {
    const timeDisplay = scheduledTimeDisplay || (lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate(), { addSuffix: false }) : null);
    
    return (
      <>
        <div 
          className={`frosted-glass-card p-3 transition-all duration-200 ${canUpdateDisposition ? 'cursor-pointer hover:bg-white/5' : ''}`}
          onClick={canUpdateDisposition ? () => {
            console.log('🔥 LeadCard - Card clicked for lead details:', { 
              leadId: lead.id, 
              customerName: lead.customerName,
              context: context,
              userRole: user?.role 
            });
            onLeadClick?.(lead);
          } : undefined}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-gray-600" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight truncate">
                {lead.customerName}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                Source: {lead.setterName ? `${lead.setterName}` : 'Web Inquiry'}
                {lead.status === "rescheduled" && lead.assignedCloserName && (
                  <span className="text-[var(--accent-light)] ml-2">• {lead.assignedCloserName}</span>
                )}
              </p>
            </div>
            
            {/* Time */}
            <div className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
              {timeDisplay}
            </div>
          </div>
        </div>
        
        {canUpdateDisposition && (
          <LeadDispositionModal
            lead={lead}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </>
    );
  }

// In your LeadCard component, update the queue-waiting section:

// Minimal display for waiting leads in the queue - now clickable for lead details
if (context === "queue-waiting") {
  const timeAgo = lead.createdAt ? formatDistanceToNow(lead.createdAt.toDate(), { addSuffix: false }) : null;
  
  return (
    <>
      <div 
        className="p-3 transition-all duration-200 cursor-pointer hover:bg-white/5"
        onClick={() => {
          console.log('🔥 LeadCard - Card clicked for lead details:', { 
            leadId: lead.id, 
            customerName: lead.customerName,
            context: context,
            userRole: user?.role 
          });
          // Always call onLeadClick for details, regardless of disposition permissions
          onLeadClick?.(lead);
        }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-gray-600" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-tight truncate">
              {lead.customerName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              Source: {lead.setterName ? `${lead.setterName}` : 'Web Inquiry'}
            </p>
          </div>
          
          {/* Time */}
          <div className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
            {timeAgo}
          </div>
        </div>
      </div>
      
      {/* Keep the disposition modal only for users who can update */}
      {canUpdateDisposition && (
        <LeadDispositionModal
          lead={lead}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

  return (
    <>
      <div className="frosted-glass-card min-h-[140px] flex flex-col transition-all duration-200 hover:bg-white/5">
        <div className="pb-2 pt-4 px-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <UserIcon className="mr-2 h-5 w-5 text-[var(--accent-light)] flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {/* Add urgency indicators for high-priority leads */}
                  {(lead.dispatchType === "immediate" && lead.createdAt && 
                    (new Date().getTime() - lead.createdAt.toDate().getTime()) < 15 * 60 * 1000) && "🚨 "}
                  {lead.customerName}
                  {/* Add value indicator for commercial leads */}
                  {lead.address && lead.address.toLowerCase().includes("commercial") && " 💎"}
                </h3>
                <div className="text-xs text-[var(--text-tertiary)] text-left">
                  Created {timeCreatedAgo}
                </div>
              </div>
            </div>
            {lead.status !== "rescheduled" && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize flex items-center gap-1 whitespace-nowrap ml-2 ${getStatusColor(lead.status)}`}>
                {getStatusIcon(lead.status)}
                {lead.status.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
        <div className="text-sm space-y-1.5 pb-3 px-4 flex-grow">
          <div className="flex items-center text-[var(--text-secondary)]">
            <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>{lead.customerPhone}</span>
          </div>
          {lead.address && (
            <div className="flex items-start text-[var(--text-secondary)]">
              <Mail className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="truncate" title={lead.address}>{lead.address}</span>
            </div>
          )}
          <div className="flex items-center text-[var(--text-secondary)]">
            <Activity className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="capitalize">{lead.dispatchType} Dispatch</span>
          </div>

          {/* Display assignment info for full details view */}
          {lead.assignedCloserName && lead.status === "in_process" && (
            <div className="flex items-center text-[var(--text-secondary)]">
              <UserIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Assigned: {lead.assignedCloserName}</span>
            </div>
          )}

          {/* Display assigned closer for rescheduled leads */}
          {lead.assignedCloserName && lead.status === "rescheduled" && (
            <div className="flex items-center text-[var(--accent-light)]">
              <UserIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="font-bold">Assigned: {lead.assignedCloserName}</span>
            </div>
          )}

          {scheduledTimeDisplay && (
            <div className="flex items-center text-[var(--accent-light)]">
              <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="font-bold">Scheduled: {scheduledTimeDisplay}</span>
            </div>
          )}

          {(user?.role === "manager" || user?.role === "admin") && lead.setterName && (
            <div className="flex items-center text-[var(--text-tertiary)] text-xs mt-1">
              <UserIcon className="mr-2 h-3 w-3 flex-shrink-0" />
              <span>Set by: {lead.setterName}</span>
            </div>
          )}
          {(user?.role === "manager" || user?.role === "admin") && lead.setterLocation && (
            <div className="flex items-center text-[var(--text-tertiary)] text-xs mt-1">
              <MapPin className="mr-2 h-3 w-3 flex-shrink-0" />
              <span>
                Loc: {lead.setterLocation.latitude.toFixed(2)}, {lead.setterLocation.longitude.toFixed(2)}
                {" "}
                <a
                  href={`https://www.google.com/maps?q=${lead.setterLocation.latitude},${lead.setterLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-light)] hover:underline"
                  aria-label="View location on map"
                >
                  (Map)
                </a>
              </span>
            </div>
          )}
          {lead.photoUrls && lead.photoUrls.length > 0 && (
            <div className="flex items-center text-[var(--text-tertiary)] text-xs mt-1">
              <ImageIcon className="mr-2 h-3 w-3 flex-shrink-0" />
              <button
                onClick={() => {
                  console.log('🔥 LeadCard - Photo gallery clicked:', { 
                    leadId: lead.id, 
                    customerName: lead.customerName,
                    photoCount: lead.photoUrls?.length || 0,
                    userRole: user?.role 
                  });
                  setIsPhotoGalleryOpen(true);
                }}
                className="text-[var(--accent-light)] hover:underline cursor-pointer"
              >
                {lead.photoUrls.length} photo(s) attached - Click to view
              </button>
            </div>
          )}
        </div>
        {canUpdateDisposition && (
          <div className="pt-0 pb-3 px-4">
            <Button 
              onClick={() => {
                console.log('🔥 LeadCard - Disposition modal trigger clicked:', { 
                  leadId: lead.id, 
                  customerName: lead.customerName,
                  context: context,
                  userRole: user?.role 
                });
                setIsModalOpen(true);
              }} 
              size="sm" 
              variant="outline"
              className="w-full bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/10 hover:text-[var(--text-primary)] transition-all duration-300"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {canUpdateDisposition && (
        <LeadDispositionModal
          lead={lead}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      {lead.photoUrls && lead.photoUrls.length > 0 && (
        <LeadPhotoGallery
          photoUrls={lead.photoUrls}
          customerName={lead.customerName}
          isOpen={isPhotoGalleryOpen}
          onClose={() => setIsPhotoGalleryOpen(false)}
        />
      )}
    </>
  );
}

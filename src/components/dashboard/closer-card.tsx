// components/dashboard/closer-card.tsx - OPTIMIZED VERSION
"use client";

import type {Closer, LeadStatus} from "@/types";
import {Card, CardContent} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {UserCheck, UserX, Loader2, ArrowUp, ArrowDown, Briefcase} from "lucide-react";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import ProfileCard from "./profile-card";
import Image from "next/image";

import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {doc, updateDoc, serverTimestamp} from "firebase/firestore";
import {useToast} from "@/hooks/use-toast";
import {useState, useCallback, memo} from "react";
import {useInView} from "react-intersection-observer";

interface CloserCardProps {
  closer: Closer;
  allowInteractiveToggle?: boolean;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showMoveControls?: boolean;
  isUpdatingOrder?: boolean;
  assignedLeadName?: string;
  onLeadClick?: () => void;
  onDispositionChange?: (status: LeadStatus, scheduledTime?: Date) => void;
  showDispositionSelector?: boolean;
  currentLeadStatus?: LeadStatus;
  leadId?: string;
  position?: number;
  renderAsCardContent?: boolean; // New prop to control card wrapper
}

// Memoized component to prevent unnecessary re-renders
const CloserCard = memo(function CloserCard({
  closer,
  allowInteractiveToggle = true,
  onMove,
  canMoveUp,
  canMoveDown,
  showMoveControls,
  isUpdatingOrder,
  assignedLeadName,
  onLeadClick,
  onDispositionChange,
  showDispositionSelector = false,
  currentLeadStatus,
  leadId,
  position,
  renderAsCardContent = false, // Default to false to maintain existing behavior
}: CloserCardProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Check lead status - memoized to avoid recalculation
  const isAcceptedLead = currentLeadStatus === "accepted";
  const isScheduledLead = currentLeadStatus === "scheduled";
  const isWaitingAssignmentLead = currentLeadStatus === "waiting_assignment";

  // Memoized permission checks
  const canUserManagerOrSelfToggle = user && (
    user.role === "manager" || 
    user.role === "admin" || 
    (user.role === "closer" && user.uid === closer.uid)
  );
  
  const showInteractiveSwitch = canUserManagerOrSelfToggle && allowInteractiveToggle && !assignedLeadName;
  const currentStatusIsOnDuty = closer.status === "On Duty";
  
  // Use Intersection Observer for lazy loading
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px', // Load images 200px before they come into view
  });
  
  // Optimized avatar URL generation with WebP support
  const getOptimizedAvatarUrl = (url: string | undefined, name: string | undefined) => {
    if (!url) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random&color=fff&format=webp`;
    }
    
    // Check if the URL is from Firebase Storage or another source that supports format conversion
    if (url.includes('firebasestorage.googleapis.com')) {
      // Append format=webp for WebP support if the URL allows query parameters
      return `${url}${url.includes('?') ? '&' : '?'}format=webp&quality=85`;
    }
    
    return url;
  };
  
  const avatarSrc = getOptimizedAvatarUrl(closer.avatarUrl, closer.name);

  // Memoized status toggle handler
  const handleToggleCloserAvailability = useCallback(async (checked: boolean) => {
    console.log('🔥 CloserCard - Status toggle clicked:', { 
      closerName: closer.name, 
      closerUid: closer.uid, 
      currentStatus: closer.status,
      newStatus: checked ? "On Duty" : "Off Duty",
      userRole: user?.role 
    });

    if (!user || !canUserManagerOrSelfToggle || assignedLeadName) return;

    setIsUpdatingStatus(true);
    const newStatus = checked ? "On Duty" : "Off Duty";

    try {
      const closerDocRef = doc(db, "closers", closer.uid);
      await updateDoc(closerDocRef, {
        status: newStatus,
      });
      toast({
        title: "Status Updated",
        description: `${closer.name || "Closer"}'s status set to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Could not update ${closer.name || "Closer"}'s status.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [user, canUserManagerOrSelfToggle, assignedLeadName, closer.uid, closer.name, closer.status, toast]);

  // Memoized profile modal handler
  const handleProfileClick = useCallback(() => {
    console.log('🔥 CloserCard - Avatar clicked:', { 
      closerName: closer.name, 
      closerUid: closer.uid,
      userRole: user?.role 
    });
    setIsProfileModalOpen(true);
  }, [closer.name, closer.uid, user?.role]);

  // Memoized lead click handler
  const handleLeadClickMemo = useCallback(() => {
    if (onLeadClick) {
      console.log('🔥 CloserCard - Lead assignment clicked:', { 
        closerName: closer.name, 
        leadName: assignedLeadName,
        userRole: user?.role 
      });
      onLeadClick();
    }
  }, [onLeadClick, closer.name, assignedLeadName, user?.role]);

  // Memoized disposition handlers
  const handleAcceptAndStart = useCallback(() => {
    if (onDispositionChange) {
      console.log('🔥 CloserCard - Accept & Start button clicked:', { 
        closerName: closer.name, 
        leadStatus: currentLeadStatus,
        leadId: leadId,
        userRole: user?.role 
      });
      onDispositionChange("in_process");
      toast({
        title: "Lead Accepted",
        description: "Lead has been accepted and is now in process."
      });
    }
  }, [onDispositionChange, closer.name, currentLeadStatus, leadId, user?.role, toast]);

  const handleAcceptJob = useCallback(() => {
    if (onDispositionChange) {
      console.log('🔥 CloserCard - Accept Job button clicked:', { 
        closerName: closer.name, 
        leadStatus: currentLeadStatus,
        leadId: leadId,
        userRole: user?.role 
      });
      onDispositionChange("accepted");
      toast({
        title: "Job Accepted",
        description: "Job has been accepted."
      });
    }
  }, [onDispositionChange, closer.name, currentLeadStatus, leadId, user?.role, toast]);

  const handleStartWorking = useCallback(() => {
    if (onDispositionChange) {
      console.log('🔥 CloserCard - Start Working button clicked:', { 
        closerName: closer.name, 
        leadStatus: currentLeadStatus,
        leadId: leadId,
        userRole: user?.role 
      });
      onDispositionChange("in_process");
      toast({
        title: "Lead Status Updated",
        description: "You are now actively working on this lead."
      });
    }
  }, [onDispositionChange, closer.name, currentLeadStatus, leadId, user?.role, toast]);

  // Memoized move handlers
  const handleMoveUp = useCallback(() => {
    if (onMove) onMove("up");
  }, [onMove]);

  const handleMoveDown = useCallback(() => {
    if (onMove) onMove("down");
  }, [onMove]);

  // Main content that will be rendered with or without card wrapper
  const cardContent = (
    <>
      <div className="flex items-start space-x-3 w-full">
        {/* Position indicator */}
        {position && (
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 text-slate-600 text-xs font-bold rounded-full border border-slate-300 closer-position-badge">
            {position}
          </div>
        )}
        
        <Avatar 
          ref={ref}
          className="h-16 w-16 border-2 shadow-md flex-shrink-0 cursor-pointer transition-all duration-300 border-slate-200 closer-avatar"
          onClick={handleProfileClick}
        >
          {inView ? (
            <AvatarImage 
              src={avatarSrc} 
              alt={closer.name || "User"} 
              loading="lazy"
              decoding="async"
              className="object-cover"
              fetchPriority="low"
            />
          ) : (
            <div className="w-full h-full bg-slate-100"></div>
          )}
          <AvatarFallback className="font-bold text-sm bg-blue-100 text-blue-900">
            {closer.name ? closer.name.substring(0, 2).toUpperCase() : "N/A"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 pl-1 closer-content">
          <div className="flex items-center justify-start">
            <p className="text-lg font-bold font-headline text-gray-900 truncate closer-name">
              {closer.name || "Unnamed Closer"}
            </p>
          </div>
          
          {assignedLeadName ? (
            <div 
              className={`flex items-start text-xs ${onLeadClick ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''} text-blue-700 closer-working-indicator`}
              onClick={handleLeadClickMemo}
              role={onLeadClick ? "button" : undefined}
              tabIndex={onLeadClick ? 0 : undefined}
              onKeyDown={onLeadClick ? (e) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault(); 
                  handleLeadClickMemo(); 
                } 
              } : undefined}
            >
              <Briefcase className="mr-1 h-3 w-3 flex-shrink-0 mt-0.5" />
              <span className="font-medium text-xs leading-tight break-words max-w-full" style={{wordBreak: 'break-word'}}>
                Working on: {assignedLeadName}
              </span>
            </div>
          ) : showInteractiveSwitch ? (
            <div className="flex items-center space-x-2 closer-status-controls">
              <Switch
                id={`status-toggle-${closer.uid}`}
                checked={currentStatusIsOnDuty}
                onCheckedChange={handleToggleCloserAvailability}
                disabled={isUpdatingStatus || isUpdatingOrder}
                aria-label={currentStatusIsOnDuty ? `Set ${closer.name || "Closer"} to Off Duty` : `Set ${closer.name || "Closer"} to On Duty`}
                className="scale-75"
              />
              <Label
                htmlFor={`status-toggle-${closer.uid}`}
                className={`text-xs font-medium ${currentStatusIsOnDuty ? "text-green-700" : "text-red-600"} closer-status-label`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  currentStatusIsOnDuty ? "Available" : "Off Duty"
                )}
              </Label>
            </div>
          ) : (
            <div className={`flex items-center text-xs ${currentStatusIsOnDuty ? "text-green-700" : "text-red-600"} closer-status-indicator`}>
              {currentStatusIsOnDuty ? (
                <UserCheck className="mr-1 h-3 w-3" />
              ) : (
                <UserX className="mr-1 h-3 w-3" />
              )}
              <span className="font-medium">{currentStatusIsOnDuty ? "Available" : "Off Duty"}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons and move controls */}
      {((isWaitingAssignmentLead || isScheduledLead || isAcceptedLead) && onDispositionChange) || 
       (showMoveControls && onMove && !assignedLeadName) ? (
        <div className="flex items-center justify-end space-x-1 mt-1.5 pt-1.5 border-t border-slate-200 closer-actions">
          {/* Accept & Start button for managers/admins on waiting_assignment and scheduled leads */}
          {(isWaitingAssignmentLead || isScheduledLead) && (user?.role === "manager" || user?.role === "admin") && onDispositionChange && (
            <Button 
              size="sm" 
              className="h-6 px-2 text-xs bg-green-500/80 backdrop-blur-sm hover:bg-green-600/90 text-white border border-green-400/30 hover:border-green-300/50 transition-all duration-300 closer-action-btn"
              onClick={handleAcceptAndStart}
            >
              Accept & Start
            </Button>
          )}
          
          {/* Accept Job button for closers on scheduled leads */}
          {isScheduledLead && user?.role === "closer" && onDispositionChange && (
            <Button 
              size="sm" 
              className="h-6 px-2 text-xs bg-green-500/80 backdrop-blur-sm hover:bg-green-600/90 text-white border border-green-400/30 hover:border-green-300/50 transition-all duration-300 closer-action-btn"
              onClick={handleAcceptJob}
            >
              Accept Job
            </Button>
          )}
          
          {/* Start Working button for closers on accepted leads */}
          {isAcceptedLead && user?.role === "closer" && onDispositionChange && (
            <Button 
              size="sm" 
              className="h-6 px-2 text-xs bg-blue-500/80 backdrop-blur-sm hover:bg-blue-600/90 text-white border border-blue-400/30 hover:border-blue-300/50 transition-all duration-300 closer-action-btn"
              onClick={handleStartWorking}
            >
              Start Working
            </Button>
          )}
          
          {/* Move Controls */}
          {showMoveControls && onMove && !assignedLeadName && (
            <div className="flex items-center space-x-1 ml-2 closer-move-controls">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5" 
                onClick={handleMoveUp} 
                disabled={!canMoveUp || isUpdatingStatus || isUpdatingOrder}
                aria-label="Move closer up in lineup"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5" 
                onClick={handleMoveDown} 
                disabled={!canMoveDown || isUpdatingStatus || isUpdatingOrder}
                aria-label="Move closer down in lineup"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );

  // Profile modal (always rendered)
  const profileModal = (
    <ProfileCard
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
      profile={{
        uid: closer.uid,
        name: closer.name || "Unnamed Closer",
        email: null,
        phone: closer.phone || null,
        avatarUrl: closer.avatarUrl || avatarSrc,
        role: "closer"
      }}
    />
  );

  // Conditionally render with or without card wrapper
  if (renderAsCardContent) {
    return (
      <>
        <div className="p-2.5">
          {cardContent}
        </div>
        {profileModal}
      </>
    );
  }

  return (
    <Card className="transition-all duration-300 min-h-[100px] flex flex-col w-full max-w-full overflow-hidden">
      <CardContent className="p-2.5 flex-1 w-full max-w-full overflow-hidden">
        {cardContent}
      </CardContent>
      {profileModal}
    </Card>
  );
});

export default CloserCard;
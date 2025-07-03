
"use client";

import { useState, useEffect } from "react";
import { ListChecks, CalendarClock, Clock, Calendar, ChevronRight, UserPlus } from "lucide-react";

// Animation effect for subtle pulse
import { useInView } from "react-intersection-observer";

// Define types for our lead objects
interface WaitingLead {
  id: number;
  name: string;
  details: string;
  priority: string;
}

interface ScheduledLead {
  id: number;
  name: string;
  details: string;
  time: string;
}

// Use union type for leads displayed in the active tab
type Lead = WaitingLead | ScheduledLead;

// Mock data for demonstration
const waitingLeads: WaitingLead[] = [
  { id: 1, name: 'Ella Johnson', details: 'Waiting for 3 days', priority: 'high' },
  { id: 2, name: 'Frank Smith', details: 'Waiting for 1 day', priority: 'normal' },
];

const scheduledLeads: ScheduledLead[] = [
  { id: 1, name: 'Grace Miller', details: 'Scheduled for Jul 5, 2025', time: '2:30 PM' },
  { id: 2, name: 'Henry Davis', details: 'Scheduled for Jul 8, 2025', time: '10:00 AM' },
];

const LeadQueue = () => {
  const [activeTab, setActiveTab] = useState('waiting');
  const [hoveredLeadId, setHoveredLeadId] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Use InView hook for element visibility detection and animations
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  // Effect to control visibility animation
  useEffect(() => {
    if (inView) {
      setIsVisible(true);
    }
  }, [inView]);

  // Calculate badge counts
  const waitingCount = waitingLeads.length;
  const scheduledCount = scheduledLeads.length;
  
  // Current date for display purposes
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div 
      ref={ref}
      data-dashboard-card 
      className={`lead-queue-container relative ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } transition-all duration-500`}
    >
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Lead Queue</h2>
          <p className="text-xs text-[var(--text-tertiary)]">{dateString}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full text-xs text-[var(--text-tertiary)]">
          <UserPlus className="w-3 h-3" />
          <span>{waitingCount + scheduledCount} leads</span>
        </div>
      </div>
      <div className="frosted-glass-card shadow-sm transition-all duration-300 dark:glow-ios-blue overflow-hidden relative">
        <div className="flex border-b border-[var(--glass-border)]">
          <button 
            onClick={() => setActiveTab('waiting')} 
            className={`py-3 px-4 text-sm font-medium flex items-center gap-2 transition-all duration-300 touch-manipulation ${
              activeTab === 'waiting' 
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }`}
            aria-pressed={activeTab === 'waiting'}
          >
            <ListChecks className="w-4 h-4" />
            Waiting List
            {waitingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-white/10 rounded-full">
                {waitingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('scheduled')} 
            className={`py-3 px-4 text-sm font-medium flex items-center gap-2 transition-all duration-300 touch-manipulation ${
              activeTab === 'scheduled' 
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }`}
            aria-pressed={activeTab === 'scheduled'}
          >
            <CalendarClock className="w-4 h-4" />
            Scheduled
            {scheduledCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-white/10 rounded-full">
                {scheduledCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          {(activeTab === 'waiting' ? waitingLeads : scheduledLeads).map(lead => (
            <div 
              key={lead.id} 
              className={`frosted-glass-card p-3 rounded-lg transition-all duration-300 flex items-center gap-3 cursor-pointer ${
                hoveredLeadId === lead.id ? 'bg-white/10 transform scale-[1.02]' : 'hover:bg-white/5'
              }`}
              onMouseEnter={() => setHoveredLeadId(lead.id)}
              onMouseLeave={() => setHoveredLeadId(null)}
              onTouchStart={() => setHoveredLeadId(lead.id)}
              onTouchEnd={() => setHoveredLeadId(null)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/5 transition-colors duration-300 ${
                hoveredLeadId === lead.id ? 'bg-white/15' : ''
              }`}>
                {activeTab === 'waiting' ? (
                  <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                ) : (
                  <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] font-medium truncate">{lead.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[var(--text-secondary)] text-xs">{lead.details}</p>
                  {activeTab === 'waiting' && 'priority' in lead && lead.priority === 'high' && (
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] bg-[#FF3B30]/20 text-[#FF3B30] rounded-full">
                      Priority
                    </span>
                  )}
                  {activeTab === 'scheduled' && 'time' in lead && (
                    <span className="text-[var(--text-tertiary)] text-xs">{lead.time}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] opacity-50" />
            </div>
          ))}
          
          {(activeTab === 'waiting' ? waitingLeads : scheduledLeads).length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-4 backdrop-blur-lg shadow-inner animate-pulse-subtle">
                {activeTab === 'waiting' ? (
                  <ListChecks className="w-6 h-6 text-[var(--text-tertiary)]" />
                ) : (
                  <CalendarClock className="w-6 h-6 text-[var(--text-tertiary)]" />
                )}
              </div>
              <p className="text-[var(--text-secondary)] font-medium mb-2">No leads {activeTab === 'waiting' ? 'waiting' : 'scheduled'}</p>
              <p className="text-[var(--text-tertiary)] text-xs max-w-[200px] mx-auto">
                {activeTab === 'waiting' 
                  ? 'New leads will appear here when added to the queue' 
                  : 'Scheduled appointments will appear here'}
              </p>
            </div>
          )}
          
          {/* Subtle pattern at bottom for visual polish */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
        </div>
        
        {/* Quick add button */}
        <button className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-[#007AFF] hover:bg-[#0056CC] transition-colors duration-300 shadow-lg shadow-[#007AFF]/25">
          <UserPlus className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export default LeadQueue;

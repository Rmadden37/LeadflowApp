"use client";

import React, { useEffect, useState } from 'react';
import { usePerformanceMonitor } from '@/utils/performance-monitor';
import OptimizedMobileLeadCard from '@/components/ui/optimized-mobile-lead-card';
import SmoothScrollContainer from '@/components/ui/smooth-scroll-container';
import { Lead } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Generate test data
const generateTestLeads = (count: number): Lead[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-lead-${i}`,
    customerName: `Test Customer ${i + 1}`,
    customerPhone: `(555) 123-${String(i).padStart(4, '0')}`,
    address: `${100 + i} Test Street, City, State`,
    teamId: 'test-team',
    status: 'scheduled' as const,
    dispatchType: 'scheduled' as const,
    setterVerified: i % 3 === 0,
    setterName: `Setter ${i % 5 + 1}`,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    scheduledAppointmentTime: Timestamp.fromDate(
      new Date(Date.now() + (i * 30 * 60 * 1000)) // Spaced 30 minutes apart
    )
  }));
};

export default function PerformanceTestPage() {
  const [testLeads] = useState(() => generateTestLeads(50));
  const { metrics, showOverlay, generateReport } = usePerformanceMonitor({
    enableFpsMonitoring: true,
    enableMemoryMonitoring: true,
    enableInteractionTracking: true,
    debug: true
  });

  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    // Show overlay after 2 seconds
    const timer = setTimeout(() => {
      if (showOverlay && !overlayVisible) {
        showOverlay();
        setOverlayVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [showOverlay, overlayVisible]);

  const handleLeadClick = (lead: Lead) => {
    console.log('Lead clicked:', lead.customerName);
  };

  const handleCall = (lead: Lead) => {
    console.log('Calling:', lead.customerName);
  };

  const handleReschedule = (lead: Lead) => {
    console.log('Rescheduling:', lead.customerName);
  };

  const handleComplete = (lead: Lead) => {
    console.log('Completing:', lead.customerName);
  };

  const handleRefresh = async () => {
    console.log('Refreshing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            🚀 Performance Test Page
          </h1>
          <p className="text-white/60 text-sm">
            Testing Aurelian's iOS optimizations
          </p>
          
          {metrics && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg text-left">
              <div className="text-xs text-white/80 space-y-1">
                <div>FPS: {metrics.fps} (avg: {metrics.averageFps})</div>
                <div>Memory: {metrics.memoryUsage} MB</div>
                <div>Interaction: {metrics.interactionLatency}ms</div>
                <div>GPU: {metrics.gpuAcceleration ? '✅' : '❌'}</div>
              </div>
            </div>
          )}
        </div>

        <SmoothScrollContainer
          height="h-[600px]"
          enablePullToRefresh={true}
          onRefresh={handleRefresh}
          className="space-y-3"
        >
          {testLeads.map((lead, index) => (
            <OptimizedMobileLeadCard
              key={lead.id}
              lead={lead}
              index={index}
              onLeadClick={handleLeadClick}
              onCall={handleCall}
              onReschedule={handleReschedule}
              onComplete={handleComplete}
            />
          ))}
        </SmoothScrollContainer>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              const report = generateReport();
              console.log('Performance Report:', report);
              alert('Check console for performance report');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            Generate Performance Report
          </button>
        </div>
      </div>
    </div>
  );
}

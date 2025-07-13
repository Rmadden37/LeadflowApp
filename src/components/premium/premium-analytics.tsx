/**
 * PREMIUM OPTIMIZED ANALYTICS - Aurelian Saloman Design
 * Delivers premium performance with intelligent loading and 60fps animations
 */

"use client";

import React, { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { PremiumSkeleton, withPremiumPerformance } from '@/lib/premium-performance';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Lazy load heavy chart components for premium performance
const ChartComponent = lazy(() => import('@/components/analytics/chart-components'));
// const SetterQuality = lazy(() => import('@/components/analytics/setter-quality-enhanced')); // Temporarily removed

interface PremiumAnalyticsProps {
  className?: string;
}

// Premium-optimized analytics dashboard
function PremiumAnalyticsDashboard({ className = '' }: PremiumAnalyticsProps) {
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<'leads' | 'performance' | 'teams'>('leads');

  // Memoized metric cards for performance
  const metricCards = useMemo(() => [
    {
      id: 'leads',
      title: 'Lead Metrics',
      icon: '📊',
      color: 'bg-blue-500/20 border-blue-500/30',
      description: 'Lead flow and conversion analytics'
    },
    {
      id: 'performance', 
      title: 'Performance',
      icon: '⚡',
      color: 'bg-green-500/20 border-green-500/30',
      description: 'Team and individual performance'
    },
    {
      id: 'teams',
      title: 'Team Analytics', 
      icon: '👥',
      color: 'bg-purple-500/20 border-purple-500/30',
      description: 'Cross-team comparative metrics'
    }
  ], []);

  // Premium interaction handlers with performance tracking
  const handleMetricChange = useCallback((metric: typeof selectedMetric) => {
    const startTime = performance.now();
    setSelectedMetric(metric);
    
    // Track premium interaction latency
    requestAnimationFrame(() => {
      const latency = performance.now() - startTime;
      if (latency > 16) {
        console.warn(`Premium Analytics: Metric change latency ${latency.toFixed(2)}ms`);
      }
    });
  }, []);

  if (!user) {
    return (
      <div className="premium-skeleton h-96 flex items-center justify-center">
        <div className="text-white/60">Loading premium analytics...</div>
      </div>
    );
  }

  return (
    <div className={`premium-analytics-dashboard ${className} space-y-6`}>
      {/* Premium Header with Hardware Acceleration */}
      <div className="hw-accelerated">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-white/60">Premium insights for data-driven decisions</p>
      </div>

      {/* Premium Metric Selector */}
      <div className="grid grid-cols-3 gap-4">
        {metricCards.map((metric) => (
          <Card
            key={metric.id}
            className={`ultra-responsive cursor-pointer transition-all duration-200 border ${
              selectedMetric === metric.id 
                ? metric.color 
                : 'border-white/10 hover:border-white/20'
            }`}
            onClick={() => handleMetricChange(metric.id as typeof selectedMetric)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{metric.icon}</div>
              <div className="text-sm font-medium text-white">{metric.title}</div>
              <div className="text-xs text-white/60 mt-1">{metric.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium Content Area with Intelligent Loading */}
      <div className="hw-accelerated">
        <Suspense fallback={<PremiumSkeleton type="analytics" className="animate-pulse" />}>
          {selectedMetric === 'leads' && (
            <div className="space-y-4">
              <SetterQuality />
              <ChartComponent type="leads" />
            </div>
          )}
          {selectedMetric === 'performance' && (
            <div className="space-y-4">
              <ChartComponent type="performance" />
            </div>
          )}
          {selectedMetric === 'teams' && (
            <div className="space-y-4">
              <ChartComponent type="teams" />
            </div>
          )}
        </Suspense>
      </div>

      {/* Premium Status Indicator */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
          ✨ Premium Analytics Active
        </Badge>
        <div className="text-xs text-white/40">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// Export with premium performance enhancements
export default withPremiumPerformance(PremiumAnalyticsDashboard);

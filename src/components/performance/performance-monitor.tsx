"use client";

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

interface MemoryInfo {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({});
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for Performance API support
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    setIsSupported(true);

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        setMetrics(prev => {
          const updated = { ...prev };

          switch (entry.entryType) {
            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              updated.ttfb = navEntry.responseStart - navEntry.fetchStart;
              updated.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
              updated.loadComplete = navEntry.loadEventEnd - navEntry.fetchStart;
              break;

            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                updated.fcp = entry.startTime;
              }
              break;

            case 'largest-contentful-paint':
              updated.lcp = entry.startTime;
              break;

            case 'first-input':
              const fidEntry = entry as any;
              updated.fid = fidEntry.processingStart - fidEntry.startTime;
              break;

            case 'layout-shift':
              const clsEntry = entry as any;
              if (!clsEntry.hadRecentInput) {
                updated.cls = (updated.cls || 0) + clsEntry.value;
              }
              break;
          }

          return updated;
        });
      });
    });

    // Observe different entry types
    try {
      observer.observe({ entryTypes: ['navigation', 'paint'] });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      observer.observe({ entryTypes: ['first-input'] });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Some performance metrics not supported:', e);
    }

    // Monitor memory usage
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const memoryInterval = setInterval(updateMemoryInfo, 5000);

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  const getScore = (metric: keyof PerformanceMetrics) => {
    const value = metrics[metric];
    if (value === undefined) return null;

    switch (metric) {
      case 'fcp':
        return value <= 1800 ? 'good' : value <= 3000 ? 'fair' : 'poor';
      case 'lcp':
        return value <= 2500 ? 'good' : value <= 4000 ? 'fair' : 'poor';
      case 'fid':
        return value <= 100 ? 'good' : value <= 300 ? 'fair' : 'poor';
      case 'cls':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'fair' : 'poor';
      case 'ttfb':
        return value <= 800 ? 'good' : value <= 1800 ? 'fair' : 'poor';
      default:
        return null;
    }
  };

  return {
    metrics,
    memoryInfo,
    isSupported,
    getScore,
  };
};

export const PerformanceDebugPanel = ({ enabled = false }: { enabled?: boolean }) => {
  const { metrics, memoryInfo, isSupported, getScore } = usePerformanceMonitor();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    if (enabled && process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
    
    // Return empty cleanup function for other cases
    return () => {};
  }, [enabled]);

  if (!enabled || !isSupported || !isVisible) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatMs = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return `${ms.toFixed(0)}ms`;
  };

  const getScoreColor = (score: string | null) => {
    switch (score) {
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg border border-white/20 text-xs font-mono backdrop-blur-sm max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">FCP:</span>
            <span className={`ml-1 ${getScoreColor(getScore('fcp'))}`}>
              {formatMs(metrics.fcp)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">LCP:</span>
            <span className={`ml-1 ${getScoreColor(getScore('lcp'))}`}>
              {formatMs(metrics.lcp)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">FID:</span>
            <span className={`ml-1 ${getScoreColor(getScore('fid'))}`}>
              {formatMs(metrics.fid)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">CLS:</span>
            <span className={`ml-1 ${getScoreColor(getScore('cls'))}`}>
              {metrics.cls?.toFixed(3) || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">TTFB:</span>
            <span className={`ml-1 ${getScoreColor(getScore('ttfb'))}`}>
              {formatMs(metrics.ttfb)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Load:</span>
            <span className="ml-1 text-blue-400">
              {formatMs(metrics.loadComplete)}
            </span>
          </div>
        </div>
        
        {memoryInfo.usedJSHeapSize && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="text-gray-400 mb-1">Memory Usage:</div>
            <div>{formatBytes(memoryInfo.usedJSHeapSize)} / {formatBytes(memoryInfo.totalJSHeapSize)}</div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-gray-500 text-xs">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

// Add gtag function declaration for Google Analytics
declare global {
  interface Window {
    gtag: (command: string, action: string, params: object) => void;
  }
}

// Performance monitoring hook for production analytics
export const useProductionMetrics = () => {
  const { metrics } = usePerformanceMonitor();

  useEffect(() => {
    // Send metrics to analytics in production
    if (process.env.NODE_ENV === 'production' && metrics.lcp) {
      // Replace with your analytics service
      console.log('Performance metrics:', metrics);
      
      // Example: Send to Google Analytics 4
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'page_performance', {
          first_contentful_paint: metrics.fcp,
          largest_contentful_paint: metrics.lcp,
          first_input_delay: metrics.fid,
          cumulative_layout_shift: metrics.cls,
        });
      }
    }
  }, [metrics]);

  return metrics;
};
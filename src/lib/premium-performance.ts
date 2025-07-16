/**
 * Premium Performance Monitor
 * Ultra-lightweight performance monitoring for iOS PWA
 */

export class PremiumPerformanceMonitor {
  private static instance: PremiumPerformanceMonitor;
  private metrics: PerformanceEntry[] = [];
  private isMonitoring = false;

  constructor(config?: any) {
    this.init();
  }

  static getInstance(): PremiumPerformanceMonitor {
    if (!PremiumPerformanceMonitor.instance) {
      PremiumPerformanceMonitor.instance = new PremiumPerformanceMonitor();
    }
    return PremiumPerformanceMonitor.instance;
  }

  private init() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitor Core Web Vitals
      this.observeWebVitals();
    }
  }

  private observeWebVitals() {
    try {
      // Observe Performance Entries
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          this.metrics.push(...list.getEntries());
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      }
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  startMonitoring() {
    this.isMonitoring = true;
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  logError(message: string) {
    console.error('Performance Error:', message);
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export default PremiumPerformanceMonitor;
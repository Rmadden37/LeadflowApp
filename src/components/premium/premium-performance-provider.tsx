// Premium Performance Initialization - Bootstrap premium performance monitoring
// Initializes all premium performance systems for production-ready performance
// Integrates with existing app architecture for seamless premium experience

"use client";

import React, { useEffect, useRef } from 'react';
import { PremiumPerformanceMonitor } from '@/lib/premium-performance';

let performanceMonitor: PremiumPerformanceMonitor | null = null;

export function PremiumPerformanceProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize premium performance monitoring
    performanceMonitor = new PremiumPerformanceMonitor({
      targetFPS: 60,
      maxLatency: 16, // 16ms for 60fps
      enableMetrics: process.env.NODE_ENV === 'development',
      enableOptimizations: true
    });

    performanceMonitor.startMonitoring();

    // Premium performance optimizations
    const applyPremiumOptimizations = () => {
      // Critical CSS injection for immediate paint
      if (typeof document !== 'undefined') {
        const criticalStyles = document.createElement('style');
        criticalStyles.textContent = `
          /* Premium critical performance styles */
          *, *::before, *::after {
            box-sizing: border-box;
          }
          
          html, body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }
          
          /* Hardware acceleration for all interactive elements */
          [data-premium-interactive] {
            will-change: transform;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Ultra-responsive touch feedback */
          .premium-touch {
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
          
          /* Premium loading states */
          .premium-loading {
            animation: premiumShimmer 1.5s ease-in-out infinite;
            background: linear-gradient(90deg, 
              rgba(255,255,255,0.1) 25%, 
              rgba(255,255,255,0.2) 50%, 
              rgba(255,255,255,0.1) 75%
            );
            background-size: 200% 100%;
          }
          
          @keyframes premiumShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          /* iOS Safari PWA optimizations */
          @supports (-webkit-touch-callout: none) {
            .premium-pwa-safe {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
              padding-left: env(safe-area-inset-left);
              padding-right: env(safe-area-inset-right);
            }
          }
        `;
        document.head.appendChild(criticalStyles);
      }

      // Mark interactive elements for hardware acceleration
      if (typeof document !== 'undefined') {
        const interactiveElements = document.querySelectorAll(
          'button, [role="button"], a, input, select, textarea, [data-premium-component]'
        );
        
        interactiveElements.forEach(el => {
          el.setAttribute('data-premium-interactive', 'true');
          el.classList.add('premium-touch');
        });
      }
    };

    // Apply optimizations immediately and on DOM changes
    applyPremiumOptimizations();
    
    // Observer for dynamically added elements
    if (typeof window !== 'undefined' && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        applyPremiumOptimizations();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      return () => observer.disconnect();
    }

    return () => {
      performanceMonitor?.stopMonitoring();
    };
  }, []);

  return <>{children}</>;
}

// Premium Performance Hook for components
export function usePremiumPerformance() {
  const metrics = useRef({
    renderTime: 0,
    lastUpdate: Date.now()
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      metrics.current.renderTime = renderTime;
      metrics.current.lastUpdate = Date.now();
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    metrics: metrics.current,
    monitor: performanceMonitor
  };
}

// Premium Component Wrapper for automatic performance tracking
export function withPremiumPerformance<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    name?: string;
    trackMetrics?: boolean;
    enableOptimizations?: boolean;
  } = {}
) {
  const {
    name = Component.displayName || Component.name || 'Anonymous',
    trackMetrics = true,
    enableOptimizations = true
  } = options;

  const WrappedComponent = (props: T) => {
    const { metrics } = usePremiumPerformance();
    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (enableOptimizations && componentRef.current) {
        // Apply premium optimizations to component
        componentRef.current.setAttribute('data-premium-component', name);
        componentRef.current.style.contain = 'layout style paint';
        componentRef.current.style.willChange = 'transform';
        componentRef.current.style.transform = 'translateZ(0)';
      }
    }, []);

    if (trackMetrics && process.env.NODE_ENV === 'development') {
      console.debug(`${name} render time:`, metrics.renderTime);
    }

    return (
      <div ref={componentRef} data-premium-component={name}>
        <Component {...props} />
      </div>
    );
  };

  WrappedComponent.displayName = `withPremiumPerformance(${name})`;
  return WrappedComponent;
}

// Premium Error Boundary for graceful degradation
export class PremiumErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Premium component error:', error, errorInfo);
    
    // Track error in premium performance monitor
    if (performanceMonitor) {
      performanceMonitor.logError(error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="premium-error-fallback p-4 text-center">
          <div className="text-sm text-muted-foreground mb-2">
            Component temporarily unavailable
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PremiumPerformanceProvider;

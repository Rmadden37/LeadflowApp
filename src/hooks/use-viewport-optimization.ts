/**
 * AURELIAN SALOMAN'S VIEWPORT-AWARE PERFORMANCE OPTIMIZATION HOOK
 * 
 * This hook uses Intersection Observer to only apply expensive animations
 * and effects to elements that are actually visible, dramatically improving
 * performance on long lists.
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ViewportObserverConfig {
  threshold?: number | number[];
  rootMargin?: string;
  enableAnimations?: boolean;
  enableGlassmorphism?: boolean;
  debug?: boolean;
}

interface ViewportState {
  isVisible: boolean;
  isNearViewport: boolean;
  intersectionRatio: number;
  shouldAnimate: boolean;
  shouldRenderEffects: boolean;
}

export function useViewportOptimization(config: ViewportObserverConfig = {}) {
  const {
    threshold = [0, 0.1, 0.5, 1],
    rootMargin = '50px',
    enableAnimations = true,
    enableGlassmorphism = true,
    debug = false
  } = config;

  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const [viewportState, setViewportState] = useState<ViewportState>({
    isVisible: false,
    isNearViewport: false,
    intersectionRatio: 0,
    shouldAnimate: false,
    shouldRenderEffects: false
  });

  // Intersection callback with performance optimizations
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      const { isIntersecting, intersectionRatio } = entry;
      const isNearViewport = intersectionRatio > 0 || isIntersecting;

      // Batch state updates for better performance
      setViewportState(prev => {
        const newState = {
          isVisible: isIntersecting,
          isNearViewport,
          intersectionRatio,
          shouldAnimate: enableAnimations && (isIntersecting || intersectionRatio > 0.1),
          shouldRenderEffects: enableGlassmorphism && (isIntersecting || intersectionRatio > 0.05)
        };

        // Only update if something actually changed
        if (
          prev.isVisible !== newState.isVisible ||
          prev.isNearViewport !== newState.isNearViewport ||
          Math.abs(prev.intersectionRatio - newState.intersectionRatio) > 0.01
        ) {
          if (debug) {
            console.log('👁️ Viewport state changed:', newState);
          }
          return newState;
        }

        return prev;
      });
    });
  }, [enableAnimations, enableGlassmorphism, debug]);

  // Setup observer
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create observer with optimized options
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: Array.isArray(threshold) ? threshold : [threshold],
      rootMargin,
      // Use the main document as root for better performance
      root: null
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, rootMargin]);

  // Dynamic class names based on viewport state
  const getOptimizedClassNames = useCallback(() => {
    const classes: string[] = [];

    if (viewportState.shouldAnimate) {
      classes.push('animate-enabled');
    } else {
      classes.push('animate-disabled');
    }

    if (viewportState.shouldRenderEffects) {
      classes.push('effects-enabled', 'in-viewport');
    } else {
      classes.push('effects-disabled');
    }

    if (viewportState.isVisible) {
      classes.push('fully-visible');
    }

    if (viewportState.isNearViewport) {
      classes.push('near-viewport');
    }

    return classes.join(' ');
  }, [viewportState]);

  // CSS custom properties for smooth transitions
  const getOptimizedStyles = useCallback((): React.CSSProperties => {
    return {
      '--viewport-opacity': viewportState.intersectionRatio.toString(),
      '--viewport-scale': (0.95 + (viewportState.intersectionRatio * 0.05)).toString(),
      '--viewport-blur': viewportState.shouldRenderEffects ? '8px' : '0px'
    } as React.CSSProperties;
  }, [viewportState]);

  return {
    elementRef,
    viewportState,
    isVisible: viewportState.isVisible,
    isNearViewport: viewportState.isNearViewport,
    intersectionRatio: viewportState.intersectionRatio,
    shouldAnimate: viewportState.shouldAnimate,
    shouldRenderEffects: viewportState.shouldRenderEffects,
    getOptimizedClassNames,
    getOptimizedStyles
  };
}

/**
 * Higher-order component for automatic viewport optimization
 */
// HOC wrapper (disabled due to TypeScript parsing issues)
// export function withViewportOptimization<T extends Record<string, unknown>>(
//   WrappedComponent: React.ComponentType<T>,
//   config: ViewportObserverConfig = {}
// ) {
//   return function ViewportOptimizedComponent(props: T) {
//     const { 
//       elementRef, 
//       getOptimizedClassNames, 
//       getOptimizedStyles,
//       shouldRenderEffects 
//     } = useViewportOptimization(config);

//     return (
//       <div
//         ref={elementRef}
//         className={getOptimizedClassNames()}
//         style={getOptimizedStyles()}
//       >
//         <WrappedComponent 
//           {...(props as any)} 
//           shouldRenderEffects={shouldRenderEffects}
//         />
//       </div>
//     );
//   };
// }

export default useViewportOptimization;

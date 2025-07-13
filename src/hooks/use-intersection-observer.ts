import { useEffect, useRef, useState } from 'react';

interface IntersectionOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  root?: Element | null;
}

/**
 * Custom hook for Intersection Observer API
 * Optimized for performance with proper cleanup and memory management
 */
export const useIntersectionObserver = (options: IntersectionOptions = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  const { 
    threshold = 0.1, 
    rootMargin = '100px', 
    triggerOnce = true,
    root = null 
  } = options;
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // Check if IntersectionObserver is supported
    if (!window.IntersectionObserver) {
      // Fallback for older browsers - assume visible
      setIsIntersecting(true);
      setHasTriggered(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        
        if (isVisible && (!triggerOnce || !hasTriggered)) {
          setIsIntersecting(true);
          setHasTriggered(true);
        } else if (!triggerOnce) {
          setIsIntersecting(isVisible);
        }
      },
      {
        threshold,
        rootMargin,
        root
      }
    );
    
    observer.observe(element);
    
    // Cleanup function
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered, root]);
  
  return { 
    ref, 
    isIntersecting,
    hasTriggered 
  };
};

/**
 * Hook for lazy loading content when it enters viewport
 * Optimized for performance with once-only triggering
 */
export const useLazyLoad = (options: Omit<IntersectionOptions, 'triggerOnce'> = {}) => {
  return useIntersectionObserver({ ...options, triggerOnce: true });
};

/**
 * Hook for visibility tracking that triggers multiple times
 * Useful for animations that should play/pause based on visibility
 */
export const useVisibilityTracker = (options: Omit<IntersectionOptions, 'triggerOnce'> = {}) => {
  return useIntersectionObserver({ ...options, triggerOnce: false });
};

/**
 * Hook for performance monitoring - tracks when elements enter/leave viewport
 * Useful for analytics and performance optimization
 */
export const useViewportTracker = (
  callback: (isVisible: boolean, entry?: IntersectionObserverEntry) => void,
  options: IntersectionOptions = {}
) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        callback(entry.isIntersecting, entry);
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px',
        root: options.root || null
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [callback, options.threshold, options.rootMargin, options.root]);
  
  return ref;
};
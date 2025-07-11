/**
 * Haptic Feedback Utility
 * Provides iOS-style haptic feedback for enhanced user experience
 */

// Haptic feedback types
export type HapticFeedbackType = 
  | 'light'       // Light tap for simple interactions
  | 'medium'      // Medium tap for standard interactions
  | 'heavy'       // Heavy tap for important actions
  | 'success'     // Success notification
  | 'warning'     // Warning notification  
  | 'error'       // Error notification
  | 'selection';  // Selection change

/**
 * Trigger haptic feedback on supported devices
 */
export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  // Check if the device supports haptic feedback
  if (typeof window === 'undefined' || !window.navigator) {
    return;
  }

  try {
    // Modern Vibration API with patterns
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 100, 50, 100, 50],
        selection: [5]
      };

      const pattern = patterns[type] || patterns.light;
      navigator.vibrate(pattern);
    }

    // iOS Safari haptic feedback (when available)
    if ('ontouchstart' in window) {
      // Use CSS animation to trigger iOS haptic feedback
      const hapticElement = document.createElement('div');
      hapticElement.style.cssText = `
        position: fixed;
        top: -1px;
        left: -1px;
        width: 1px;
        height: 1px;
        pointer-events: none;
        z-index: -1;
        opacity: 0;
        transform: translateZ(0);
        will-change: transform;
      `;
      
      document.body.appendChild(hapticElement);
      
      // Trigger a micro-animation that iOS can detect for haptic feedback
      requestAnimationFrame(() => {
        hapticElement.style.transform = 'translateZ(1px)';
        setTimeout(() => {
          if (hapticElement.parentNode) {
            document.body.removeChild(hapticElement);
          }
        }, 50);
      });
    }

  } catch (error) {
    // Silently fail if haptic feedback is not supported
    console.debug('Haptic feedback not supported:', error);
  }
}

/**
 * Enhanced button press haptic with visual feedback
 */
export function triggerButtonPress(element?: HTMLElement, type: HapticFeedbackType = 'light'): void {
  triggerHaptic(type);
  
  // Add visual press feedback
  if (element) {
    element.style.transform = 'scale(0.98)';
    element.style.transition = 'transform 0.1s ease-out';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      setTimeout(() => {
        element.style.transition = '';
      }, 100);
    }, 50);
  }
}

/**
 * Specialized haptic feedback for different UI interactions
 */
export const hapticFeedback = {
  // Button interactions
  buttonTap: () => triggerHaptic('light'),
  buttonPress: (element?: HTMLElement) => triggerButtonPress(element, 'medium'),
  primaryAction: (element?: HTMLElement) => triggerButtonPress(element, 'heavy'),
  
  // Form interactions
  inputFocus: () => triggerHaptic('selection'),
  inputChange: () => triggerHaptic('light'),
  formSubmit: () => triggerHaptic('success'),
  formError: () => triggerHaptic('error'),
  
  // Navigation
  pageChange: () => triggerHaptic('medium'),
  tabSwitch: () => triggerHaptic('selection'),
  modalOpen: () => triggerHaptic('light'),
  modalClose: () => triggerHaptic('light'),
  
  // Notifications
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  
  // List interactions
  listItemSelect: () => triggerHaptic('selection'),
  swipeAction: () => triggerHaptic('medium'),
  
  // Special actions
  refresh: () => triggerHaptic('medium'),
  delete: () => triggerHaptic('warning'),
  confirm: () => triggerHaptic('success')
};

/**
 * Hook for React components to use haptic feedback
 */
export function useHapticFeedback() {
  return {
    triggerHaptic,
    triggerButtonPress,
    ...hapticFeedback
  };
}

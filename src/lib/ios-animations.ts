/**
 * iOS-Native Animation Utilities
 * Consistent animation patterns following Apple's design guidelines
 * 
 * By Aurelian Salomon - iOS UI/UX Expert
 */

export const iOSAnimations = {
  // Standard iOS spring timing function
  spring: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // iOS ease timing functions
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  
  // Standard durations (in milliseconds)
  durations: {
    fast: 150,      // Quick state changes
    normal: 200,    // Standard transitions
    slow: 300,      // Complex animations
    navigation: 350 // Page transitions
  },
  
  // Scale transforms for press states
  scales: {
    press: 0.95,    // Button press effect
    selection: 1.05, // Selection highlight
    hover: 1.02     // Subtle hover effect
  }
} as const;

/**
 * Generate iOS-style CSS animation strings
 */
export const iOSTransitions = {
  // Standard iOS button transition
  button: `transform ${iOSAnimations.durations.fast}ms ${iOSAnimations.spring}, 
           color ${iOSAnimations.durations.normal}ms ${iOSAnimations.easeOut}`,
  
  // Navigation transition
  navigation: `all ${iOSAnimations.durations.navigation}ms ${iOSAnimations.spring}`,
  
  // Tab selection transition
  tab: `color ${iOSAnimations.durations.normal}ms ${iOSAnimations.spring}, 
        transform ${iOSAnimations.durations.normal}ms ${iOSAnimations.spring}`,
  
  // Backdrop blur transition
  blur: `backdrop-filter ${iOSAnimations.durations.normal}ms ${iOSAnimations.easeOut}`,
  
  // Scale animation for press states
  scale: `transform ${iOSAnimations.durations.fast}ms ${iOSAnimations.spring}`
} as const;

/**
 * iOS-style animation classes for Tailwind CSS
 */
export const iOSClasses = {
  // Press animation
  'ios-press': {
    transition: iOSTransitions.scale,
    '&:active': {
      transform: `scale(${iOSAnimations.scales.press})`
    }
  },
  
  // Hover animation (for non-touch devices)
  'ios-hover': {
    transition: iOSTransitions.scale,
    '@media (hover: hover)': {
      '&:hover': {
        transform: `scale(${iOSAnimations.scales.hover})`
      }
    }
  },
  
  // Selection highlight
  'ios-selection': {
    transition: iOSTransitions.tab,
    '&.active': {
      transform: `scale(${iOSAnimations.scales.selection})`
    }
  },
  
  // Spring bounce effect
  'ios-bounce': {
    animation: 'iosBounce 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    '@keyframes iosBounce': {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' }
    }
  }
} as const;

/**
 * Apply iOS-style press animation to an element
 */
export function applyIOSPress(element: HTMLElement) {
  element.style.transition = iOSTransitions.scale;
  
  const handlePress = () => {
    element.style.transform = `scale(${iOSAnimations.scales.press})`;
  };
  
  const handleRelease = () => {
    element.style.transform = 'scale(1)';
  };
  
  element.addEventListener('touchstart', handlePress, { passive: true });
  element.addEventListener('touchend', handleRelease, { passive: true });
  element.addEventListener('touchcancel', handleRelease, { passive: true });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handlePress);
    element.removeEventListener('touchend', handleRelease);
    element.removeEventListener('touchcancel', handleRelease);
  };
}

/**
 * React hook for iOS-style animations
 */
export function useIOSAnimation() {
  const applyPress = (ref: React.RefObject<HTMLElement>) => {
    if (!ref.current) return;
    return applyIOSPress(ref.current);
  };
  
  return {
    applyPress,
    animations: iOSAnimations,
    transitions: iOSTransitions,
    classes: iOSClasses
  };
}

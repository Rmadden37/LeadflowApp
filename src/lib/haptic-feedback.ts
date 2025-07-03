/**
 * iOS-Style Haptic Feedback System
 * Provides native-like tactile feedback for user interactions
 */

export class HapticFeedback {
  private static isSupported = 'vibrate' in navigator;

  /**
   * Light haptic feedback - for subtle interactions
   * Used for: Button taps, toggle switches, selection changes
   */
  static light() {
    if (this.isSupported) {
      navigator.vibrate(10);
    }
  }

  /**
   * Medium haptic feedback - for important actions
   * Used for: Form submissions, confirmations, notifications
   */
  static medium() {
    if (this.isSupported) {
      navigator.vibrate(20);
    }
  }

  /**
   * Heavy haptic feedback - for critical actions
   * Used for: Errors, warnings, deletions, major state changes
   */
  static heavy() {
    if (this.isSupported) {
      navigator.vibrate([30, 10, 30]);
    }
  }

  /**
   * Success haptic pattern - for positive feedback
   * Used for: Successful submissions, completions
   */
  static success() {
    if (this.isSupported) {
      navigator.vibrate([15, 10, 15]);
    }
  }

  /**
   * Error haptic pattern - for negative feedback
   * Used for: Validation errors, failed actions
   */
  static error() {
    if (this.isSupported) {
      navigator.vibrate([40, 20, 40, 20, 40]);
    }
  }

  /**
   * Selection haptic - for picker/scroll feedback
   * Used for: Scrolling through lists, picker changes
   */
  static selection() {
    if (this.isSupported) {
      navigator.vibrate(5);
    }
  }
}

/**
 * React Hook for Haptic Feedback
 */
export function useHapticFeedback() {
  return {
    light: HapticFeedback.light,
    medium: HapticFeedback.medium,
    heavy: HapticFeedback.heavy,
    success: HapticFeedback.success,
    error: HapticFeedback.error,
    selection: HapticFeedback.selection,
  };
}

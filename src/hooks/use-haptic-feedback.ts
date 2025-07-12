"use client";

import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function useHapticFeedback() {
  const triggerHaptic = useCallback((pattern: HapticPattern = 'light') => {
    // Check if haptic feedback is supported (iOS devices)
    if (typeof window === 'undefined' || !('navigator' in window)) return;
    
    // Try the Haptic Feedback API first (newer iOS versions)
    if ('vibrate' in navigator) {
      let vibrationPattern: number | number[];
      
      switch (pattern) {
        case 'light':
          vibrationPattern = 10;
          break;
        case 'medium':
          vibrationPattern = 20;
          break;
        case 'heavy':
          vibrationPattern = 40;
          break;
        case 'success':
          vibrationPattern = [10, 50, 10];
          break;
        case 'warning':
          vibrationPattern = [20, 100, 20];
          break;
        case 'error':
          vibrationPattern = [40, 100, 40, 100, 40];
          break;
        case 'selection':
          vibrationPattern = 5;
          break;
        default:
          vibrationPattern = 10;
      }
      
      navigator.vibrate(vibrationPattern);
      return;
    }
    
    // Fallback for older iOS devices - try to access the haptic feedback through touch events
    // This is a more subtle approach that works with iOS Safari
    try {
      // Create a temporary audio context for iOS haptic feedback simulation
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Create a very brief, nearly inaudible tone that can trigger haptic response
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure for minimal audio but maximum haptic effect
        oscillator.frequency.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
        
        const duration = pattern === 'heavy' ? 0.04 : pattern === 'medium' ? 0.02 : 0.01;
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
        
        // Clean up
        setTimeout(() => {
          try {
            audioContext.close();
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 100);
      }
    } catch (error) {
      // Silently fail - haptic feedback is optional
      console.debug('Haptic feedback not available:', error);
    }
  }, []);

  return {
    triggerHaptic,
    // Convenience methods
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    selection: () => triggerHaptic('selection'),
  };
}

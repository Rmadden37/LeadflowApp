"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * iOS Theme Fix Component
 * 
 * This component addresses the white screen issue on iPhone and iPad devices
 * by ensuring proper dark mode detection and enforcement on iOS Safari.
 */
export function IOSThemeFix() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Detect if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    
    if (!isIOS) return; // Only apply fix for iOS devices

    console.log('🍎 iOS detected - applying theme fix');
    console.log('Theme info:', { theme, systemTheme, resolvedTheme });

    // Force dark mode check on iOS
    const applyIOSThemeFix = () => {
      const html = document.documentElement;
      const body = document.body;
      
      // Get the actual system theme preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      console.log('🌙 System prefers dark:', prefersDark);
      console.log('🎨 Current HTML classes:', html.className);
      
      // For iOS, we'll enforce dark mode since your app is designed for it
      if (!html.classList.contains('dark')) {
        console.log('⚠️  Dark class missing on iOS - adding it now');
        html.classList.add('dark');
        
        // Also ensure the data attribute is set
        html.setAttribute('data-theme', 'dark');
        html.style.colorScheme = 'dark';
      }
      
      // Ensure body has proper dark styling
      if (!body.style.backgroundColor || body.style.backgroundColor === 'white') {
        console.log('🔧 Fixing body background color on iOS');
        body.style.backgroundColor = '#0D0D0D';
        body.style.color = '#FFFFFF';
      }
      
      // Force theme if it's not set correctly
      if (theme === 'system' && prefersDark && resolvedTheme !== 'dark') {
        console.log('🔄 Forcing dark theme on iOS');
        setTheme('dark');
      }
    };

    // Apply fix immediately
    applyIOSThemeFix();
    
    // Apply fix after a short delay to catch any late theme applications
    const timeout1 = setTimeout(applyIOSThemeFix, 100);
    const timeout2 = setTimeout(applyIOSThemeFix, 500);
    
    // Listen for theme changes in media queries
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      console.log('🔄 iOS theme preference changed');
      applyIOSThemeFix();
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Listen for page visibility changes (iOS app switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 iOS app became visible - reapplying theme');
        setTimeout(applyIOSThemeFix, 50);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      mediaQuery.removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme, setTheme, systemTheme, resolvedTheme]);

  // Don't render anything visible
  return null;
}

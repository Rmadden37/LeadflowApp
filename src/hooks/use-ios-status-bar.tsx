/**
 * ✨ AURELIAN'S iOS STATUS BAR MANAGER
 * 
 * Handles iOS status bar behavior for PWA:
 * - Status bar style management
 * - Safe area handling
 * - Dynamic status bar colors
 * - Proper iOS integration
 */

"use client";

import React, { useEffect } from 'react';

interface StatusBarConfig {
  style?: 'default' | 'light-content' | 'dark-content';
  backgroundColor?: string;
  translucent?: boolean;
}

export const useIOSStatusBar = (config: StatusBarConfig = {}) => {
  const {
    style = 'light-content',
    backgroundColor = '#000000',
    translucent = true,
  } = config;

  useEffect(() => {
    // Set status bar style for iOS PWA
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) {
      metaStatusBar.setAttribute('content', translucent ? 'black-translucent' : style);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = translucent ? 'black-translucent' : style;
      document.head.appendChild(meta);
    }

    // Set theme color for status bar background
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', backgroundColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = backgroundColor;
      document.head.appendChild(meta);
    }

    // Handle viewport meta tag for proper iOS behavior
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const currentContent = viewport.getAttribute('content') || '';
      if (!currentContent.includes('viewport-fit=cover')) {
        viewport.setAttribute('content', `${currentContent}, viewport-fit=cover`);
      }
    }
  }, [style, backgroundColor, translucent]);
};

export const IOSStatusBarSpacer = ({ className }: { className?: string }) => {
  return (
    <div 
      className={`w-full ${className || ''}`}
      style={{ 
        height: 'env(safe-area-inset-top, 20px)',
        backgroundColor: 'transparent',
      }} 
    />
  );
};

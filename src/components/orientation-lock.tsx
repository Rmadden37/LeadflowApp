"use client";

import { useEffect } from "react";

export default function OrientationLock() {
  useEffect(() => {
    // Remove any existing orientation styles to avoid conflicts
    const removeExistingStyles = () => {
      const existingStyles = document.querySelectorAll('style[data-orientation-lock]');
      existingStyles.forEach(style => style.remove());
    };
    
    // Function to lock the screen orientation to portrait
    const lockOrientation = async () => {
      // Clean up existing styles first
      removeExistingStyles();
      try {
        // Using type assertion to access the orientation API
        const screenOrientation = (screen as any).orientation;
        
        if (screenOrientation && typeof screenOrientation.lock === "function") {
          await screenOrientation.lock("portrait");
          console.log("Screen orientation locked to portrait");
        } else {
          console.log("Screen Orientation API not supported on this device");
          
          // Fallback to our CSS solution for unsupported browsers
          const style = document.createElement('style');
          style.setAttribute('data-orientation-lock', 'true');
          style.innerHTML = `
            @media screen and (orientation: landscape) {
              html, body {
                transform: rotate(90deg);
                transform-origin: right top;
                width: 100vh;
                height: 100vw;
                overflow-x: hidden;
                position: absolute;
                top: 0;
                right: 0;
              }
            }
          `;
          document.head.appendChild(style);
        }
      } catch (error) {
        console.error("Failed to lock screen orientation:", error);
        
        // If lock fails, fall back to CSS solution
        const style = document.createElement('style');
        style.setAttribute('data-orientation-lock', 'true');
        style.innerHTML = `
          @media screen and (orientation: landscape) {
            html, body {
              transform: rotate(90deg);
              transform-origin: right top;
              width: 100vh;
              height: 100vw;
              overflow-x: hidden;
              position: absolute;
              top: 0;
              right: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    };

    // Lock the orientation when component mounts
    lockOrientation();

    // Add event listener to relock orientation when device is rotated
    const handleOrientationChange = () => {
      lockOrientation();
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    // Cleanup event listener and styles on unmount
    return () => {
      if (typeof window !== "undefined" && window.removeEventListener) {
        window.removeEventListener("orientationchange", handleOrientationChange);
      }
      // Also remove any styles we added
      removeExistingStyles();
    };
  }, []);

  // This component doesn't render anything
  return null;
}

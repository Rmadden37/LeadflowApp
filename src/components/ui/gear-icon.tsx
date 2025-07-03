import React from 'react';

interface GearIconProps {
  className?: string;
  size?: number;
}

export const GearIcon: React.FC<GearIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"currentColor", stopOpacity:1}} />
          <stop offset="50%" style={{stopColor:"currentColor", stopOpacity:0.8}} />
          <stop offset="100%" style={{stopColor:"currentColor", stopOpacity:0.6}} />
        </linearGradient>
      </defs>
      
      {/* Main gear shape matching your original */}
      <g transform="translate(256, 256)">
        
        {/* Gear teeth - 8 main teeth positioned around the circle */}
        {/* Top tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)"/>
        
        {/* Top-right tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(45)"/>
        
        {/* Right tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(90)"/>
        
        {/* Bottom-right tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(135)"/>
        
        {/* Bottom tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(180)"/>
        
        {/* Bottom-left tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(225)"/>
        
        {/* Left tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(270)"/>
        
        {/* Top-left tooth */}
        <rect x="-20" y="-200" width="40" height="80" rx="8" fill="url(#blueGradient)" transform="rotate(315)"/>
        
        {/* Main circular body */}
        <circle r="120" fill="url(#blueGradient)"/>
        
        {/* Inner white circle (hole) */}
        <circle r="60" fill="white"/>
        
      </g>
    </svg>
  );
};

export default GearIcon;

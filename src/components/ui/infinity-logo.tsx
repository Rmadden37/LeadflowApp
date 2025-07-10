import React from 'react';

interface InfinityLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const InfinityLogo: React.FC<InfinityLogoProps> = ({ size = 48, className = '', animated = true }) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ overflow: 'hidden' }}>
      <svg
        width={size * 1.2}
        height={size}
        viewBox="0 0 75 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
        style={{ overflow: 'hidden' }}
      >
        <defs>
          {/* Gradient for the infinity symbol */}
          <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
          
          {/* Gradient for the glowing orb */}
          <radialGradient id="orbGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="20%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </radialGradient>
          
          {/* Glow effect for the orb */}
          <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Inner shadow for depth */}
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feOffset dx="1" dy="2"/>
            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
            <feFlood floodColor="#1e293b" floodOpacity="0.3"/>
            <feComposite in2="offset-blur" operator="in"/>
            <feMerge> 
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Infinity Symbol Path */}
        <path
          d="M20 40 C20 20, 35 20, 40 40 C45 60, 55 60, 60 40 C65 20, 75 20, 80 40 C85 60, 100 60, 100 40 C100 20, 85 20, 80 40 C75 60, 65 60, 60 40 C55 20, 45 20, 40 40 C35 60, 20 60, 20 40 Z"
          fill="url(#infinityGradient)"
          stroke="#64748b"
          strokeWidth="1"
          filter="url(#innerShadow)"
          className="drop-shadow-md"
        />
      </svg>
    </div>
  );
};

export default InfinityLogo;

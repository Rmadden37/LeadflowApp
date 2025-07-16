"use client";

import React from 'react';
import './ios-toggle.css';

interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const IOSToggle = React.forwardRef<HTMLButtonElement, IOSToggleProps>(({ 
  checked, 
  onChange, 
  disabled = false,
  className 
}, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`ios-toggle ${checked ? 'checked' : ''} ${className || ''}`}
    >
      {/* Toggle thumb */}
      <span className="ios-toggle-thumb" />
    </button>
  );
});

IOSToggle.displayName = "IOSToggle";

export { IOSToggle };

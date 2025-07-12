"use client";

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

interface PremiumButtonProps extends ButtonProps {
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';
  premiumStyle?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

export function PremiumButton({ 
  className,
  onClick,
  hapticPattern = 'light',
  premiumStyle = 'primary',
  children,
  disabled,
  ...props 
}: PremiumButtonProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      triggerHaptic(hapticPattern);
      onClick?.(e);
    }
  };

  const premiumStyles = {
    primary: `
      relative w-full h-14 text-lg font-semibold rounded-2xl 
      bg-primary hover:bg-primary/90 text-primary-foreground
      active:scale-[0.95] transition-all duration-200 ease-out
      shadow-xl shadow-primary/30 backdrop-blur-sm
      disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed
      border-0 focus:ring-2 focus:ring-primary/30 focus:ring-offset-0
      min-h-[56px] px-8 overflow-hidden
      before:absolute before:inset-0 before:bg-gradient-to-r 
      before:from-white/10 before:to-transparent before:opacity-0 
      hover:before:opacity-100 before:transition-opacity before:duration-300
    `,
    secondary: `
      relative w-full h-14 text-lg font-semibold rounded-2xl 
      bg-secondary hover:bg-secondary/80 text-secondary-foreground
      active:scale-[0.95] transition-all duration-200 ease-out
      shadow-lg shadow-black/10 backdrop-blur-sm
      disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed
      border border-border/30 focus:ring-2 focus:ring-secondary/30 focus:ring-offset-0
      min-h-[56px] px-8 overflow-hidden
      hover:shadow-xl hover:shadow-black/20
    `,
    ghost: `
      relative h-12 text-base font-medium rounded-xl 
      bg-transparent hover:bg-secondary/10 text-foreground
      active:scale-[0.95] transition-all duration-200 ease-out
      disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed
      border-0 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0
      px-6 overflow-hidden
      hover:backdrop-blur-sm
    `,
    outline: `
      relative h-12 text-base font-medium rounded-xl 
      bg-transparent hover:bg-primary/5 text-primary border border-primary/30
      active:scale-[0.95] transition-all duration-200 ease-out
      disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed
      focus:ring-2 focus:ring-primary/30 focus:ring-offset-0
      px-6 overflow-hidden backdrop-blur-sm
      hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10
    `
  };

  return (
    <Button
      className={cn(premiumStyles[premiumStyle], className)}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

// Enhanced button wrapper for existing buttons
export function EnhancedButton({ 
  className,
  onClick,
  hapticPattern = 'light',
  children,
  disabled,
  ...props 
}: PremiumButtonProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      triggerHaptic(hapticPattern);
      onClick?.(e);
    }
  };

  return (
    <Button
      className={cn(
        'active:scale-[0.95] transition-all duration-200 ease-out',
        'disabled:scale-100',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

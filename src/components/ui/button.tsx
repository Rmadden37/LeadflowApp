import * as React from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";

import {cn} from "@/lib/utils";
import {useHapticFeedback} from "@/lib/haptic-feedback";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none relative overflow-hidden ios-button-base",
  {
    variants: {
      variant: {
        "default": "text-primary-foreground bg-gradient-to-r from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))] hover:from-[hsl(var(--primary-gradient-to))] hover:to-[hsl(var(--primary-gradient-from))] shadow-md hover:shadow-lg ios-button-primary",
        "destructive":
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg ios-button-destructive",
        "outline":
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md ios-button-outline",
        "secondary":
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md ios-button-secondary",
        "ghost": "hover:bg-accent hover:text-accent-foreground ios-button-ghost",
        "link": "text-primary underline-offset-4 hover:underline ios-button-link",
        "primary-solid": "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg ios-button-primary-solid",
        "ios-system": "bg-[#007AFF] text-white hover:bg-[#0056CC] shadow-md hover:shadow-lg ios-button-system",
        "ios-fill": "bg-[rgba(120,120,128,0.16)] text-foreground hover:bg-[rgba(120,120,128,0.24)] ios-button-fill backdrop-blur-md",
        "ios-plain": "text-[#007AFF] hover:bg-[rgba(0,122,255,0.1)] ios-button-plain",
        "ios-tinted": "bg-[rgba(0,122,255,0.15)] text-[#007AFF] hover:bg-[rgba(0,122,255,0.25)] ios-button-tinted backdrop-blur-sm"
      },
      size: {
        default: "h-10 px-4 py-2 min-h-touch mobile:h-12 mobile:px-6 mobile:text-base",
        sm: "h-9 rounded-md px-3 min-h-touch mobile:h-10 mobile:px-4",
        lg: "h-11 rounded-md px-8 min-h-touch mobile:h-14 mobile:px-10 mobile:text-lg",
        icon: "h-10 w-10 min-h-touch min-w-touch mobile:h-12 mobile:w-12",
        "ios-compact": "h-8 px-3 py-1 text-xs mobile:h-9 mobile:px-4 mobile:text-sm rounded-full",
        "ios-regular": "h-11 px-6 py-3 mobile:h-13 mobile:px-8 mobile:text-base rounded-xl font-semibold",
        "ios-prominent": "h-14 px-8 py-4 mobile:h-16 mobile:px-10 mobile:text-lg rounded-2xl font-bold"
      },
      loading: {
        true: "ios-button-loading cursor-wait",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection' | 'none';
  ios?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    hapticFeedback = 'light',
    ios = false,
    asChild = false, 
    children,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const haptic = useHapticFeedback();
    const [isPressed, setIsPressed] = React.useState(false);
    const [ripplePosition, setRipplePosition] = React.useState<{x: number, y: number} | null>(null);
    
    // Enhanced iOS interaction handling
    const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
      if (disabled || loading) return;
      
      setIsPressed(true);
      
      // Calculate ripple position for iOS-style feedback
      if (ios) {
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        setRipplePosition({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
      }
      
      // Immediate haptic feedback on touch start (iOS pattern)
      if (hapticFeedback !== 'none') {
        haptic[hapticFeedback]();
      }
    }, [disabled, loading, ios, hapticFeedback, haptic]);
    
    const handleTouchEnd = React.useCallback(() => {
      setIsPressed(false);
      setRipplePosition(null);
    }, []);
    
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        e.preventDefault();
        return;
      }
      
      // Desktop haptic feedback simulation
      if (hapticFeedback !== 'none' && !('ontouchstart' in window)) {
        haptic[hapticFeedback]();
      }
      
      onClick?.(e);
    }, [disabled, loading, hapticFeedback, haptic, onClick]);
    
    const buttonContent = React.useMemo(() => {
      if (loading) {
        return (
          <>
            <div className="ios-spinner w-4 h-4" />
            <span className="opacity-70">
              {typeof children === 'string' ? children : 'Loading...'}
            </span>
          </>
        );
      }
      return children;
    }, [loading, children]);

    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, loading, className }),
          {
            'ios-button-pressed': isPressed && ios,
            'ios-button-interactive': ios,
            'transform transition-transform duration-150 ease-out': true,
            'scale-[0.97]': isPressed,
            'active:scale-[0.95]': !ios,
          }
        )}
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {/* iOS-style ripple effect */}
        {ios && ripplePosition && (
          <span 
            className="absolute inset-0 overflow-hidden rounded-[inherit]"
            style={{ pointerEvents: 'none' }}
          >
            <span
              className="absolute bg-white/20 rounded-full animate-ios-ripple"
              style={{
                insetInlineStart: ripplePosition.x - 8,
                insetBlockStart: ripplePosition.y - 8,
                inlineSize: 16,
                blockSize: 16,
              }}
            />
          </span>
        )}
        
        {/* iOS-style shine effect for premium feel */}
        {ios && !loading && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] animate-ios-shine" />
        )}
        
        {buttonContent}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export {Button, buttonVariants};

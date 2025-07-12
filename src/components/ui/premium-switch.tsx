"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";

interface PremiumSwitchProps 
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  hapticPattern?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';
}

const PremiumSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  PremiumSwitchProps
>(({ className, hapticPattern = 'light', onCheckedChange, ...props }, ref) => {
  const { triggerHaptic } = useHapticFeedback();
  
  const handleCheckedChange = (checked: boolean) => {
    triggerHaptic(hapticPattern);
    onCheckedChange?.(checked);
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "active:scale-95 transition-transform duration-150", // Premium micro-animation
        className
      )}
      onCheckedChange={handleCheckedChange}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  );
});

PremiumSwitch.displayName = SwitchPrimitives.Root.displayName;

export { PremiumSwitch };

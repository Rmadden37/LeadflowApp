import * as React from "react";

import {cn} from "@/lib/utils";
import {useHapticFeedback} from "@/utils/haptic";

export interface InputProps extends React.ComponentProps<"input"> {
  hapticFeedback?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({className, type, hapticFeedback = true, onFocus, onChange, ...props}, ref) => {
    const haptic = useHapticFeedback();

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      if (hapticFeedback) {
        haptic.inputFocus();
      }
      onFocus?.(e);
    }, [hapticFeedback, haptic, onFocus]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (hapticFeedback) {
        haptic.inputChange();
      }
      onChange?.(e);
    }, [hapticFeedback, haptic, onChange]);

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 touch-manipulation",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export {Input};

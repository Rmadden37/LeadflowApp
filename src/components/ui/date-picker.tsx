"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  error?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled,
  className,
  minDate,
  maxDate,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Set client-side flag to enable portal rendering
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Close calendar when clicking outside (simplified since we have overlay)
  React.useEffect(() => {
    // No need for complex click detection since overlay handles it
  }, [open]);

  // Default disabled function to prevent past dates
  const defaultDisabled = React.useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let isDisabled = date < today;
    
    if (minDate) {
      isDisabled = isDisabled || date < minDate;
    }
    
    if (maxDate) {
      isDisabled = isDisabled || date > maxDate;
    }
    
    return isDisabled;
  }, [minDate, maxDate]);

  const finalDisabled = disabled || defaultDisabled;

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal transition-colors",
          !date && "text-muted-foreground",
          error && "border-destructive",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
        aria-label={date ? `Selected date: ${format(date, "PPP")}` : placeholder}
        onClick={() => setOpen(!open)}
      >
        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {date ? format(date, "PPP") : placeholder}
        </span>
      </Button>

      {/* Calendar Portal - Using Portal to prevent dialog layout shifts */}
      {open && isClient && (
        <>
          {/* Invisible overlay to prevent click-through */}
          {createPortal(
            <div 
              className="fixed inset-0 z-[99998]"
              onClick={() => setOpen(false)}
            />,
            document.body
          )}
          {/* Calendar */}
          {createPortal(
            <div 
              data-calendar-portal
              className="fixed z-[99999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl p-3 pointer-events-auto"
              style={{
                top: buttonRef.current 
                  ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4
                  : 0,
                left: buttonRef.current 
                  ? buttonRef.current.getBoundingClientRect().left + window.scrollX
                  : 0,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                background: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  if (selectedDate) {
                    onDateChange(selectedDate);
                    setOpen(false);
                  }
                }}
                disabled={finalDisabled}
                initialFocus
                className="rounded-lg pointer-events-auto bg-transparent"
                classNames={{
                  day_selected: "bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white !bg-opacity-100 shadow-lg border-2 border-blue-400 pointer-events-auto",
                  day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold pointer-events-auto",
                  day: "pointer-events-auto cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800",
                  button: "pointer-events-auto text-gray-900 dark:text-gray-100",
                  caption: "text-gray-900 dark:text-gray-100 font-medium",
                  nav_button: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  head_cell: "text-gray-600 dark:text-gray-400",
                }}
              />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

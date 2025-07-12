"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'avatar' | 'text' | 'button';
  animate?: boolean;
}

function Skeleton({
  className,
  variant = 'default',
  animate = true,
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-md";
  
  const variantClasses = {
    default: "h-4 w-full",
    card: "h-24 w-full rounded-xl",
    avatar: "h-12 w-12 rounded-full",
    text: "h-4 w-3/4",
    button: "h-10 w-24 rounded-lg"
  };

  const animationClasses = animate 
    ? "animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" 
    : "";

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses,
        className
      )}
      style={{
        backgroundImage: animate 
          ? 'linear-gradient(90deg, hsl(var(--muted)/0.6) 25%, hsl(var(--muted)/0.4) 50%, hsl(var(--muted)/0.6) 75%)'
          : undefined
      }}
      {...props}
    />
  );
}

// iOS-style skeleton loader for cards
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 p-4 rounded-xl bg-card border", className)} {...props}>
      <div className="flex items-center space-x-3">
        <Skeleton variant="avatar" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="h-4 w-1/2" />
          <Skeleton variant="text" className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
    </div>
  );
}

// iOS-style skeleton loader for closer lineup
function SkeletonCloserLineup() {
  return (
    <div className="frosted-glass-card p-4">
      <div className="grid grid-cols-3 gap-4 py-6 px-4 items-start justify-items-center min-h-[120px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center w-full max-w-[85px]">
            <div className="relative mb-3">
              <Skeleton variant="avatar" className="w-12 h-12" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-muted rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

// iOS-style skeleton for dashboard stats
function SkeletonDashboardCard() {
  return (
    <div className="frosted-glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-5 w-1/3" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      <Skeleton className="h-8 w-1/2" />
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-3/4" />
      </div>
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonCloserLineup, 
  SkeletonDashboardCard 
};

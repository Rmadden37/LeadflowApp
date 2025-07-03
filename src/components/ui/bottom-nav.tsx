"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/lib/haptic-feedback";
import { useAuth } from "@/hooks/use-auth";

const BOTTOM_NAV_HEIGHT = "5rem"; // 80px for iOS comfort

type BottomNavContextType = {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
};

const BottomNavContext = React.createContext<BottomNavContextType | null>(null);

function useBottomNav() {
  const context = React.useContext(BottomNavContext);
  if (!context) {
    throw new Error("useBottomNav must be used within a BottomNavProvider.");
  }
  return context;
}

const BottomNavProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultTab?: string;
  }
>(({ defaultTab = "dashboard", className, style, children, ...props }, ref) => {
  const pathname = usePathname();
  
  // Derive current tab from pathname
  const getCurrentTab = () => {
    if (pathname.includes('/leaderboard')) return 'leaderboard';
    if (pathname.includes('/manager') || pathname.includes('/lead-history') || 
        pathname.includes('/manage-teams') || pathname.includes('/analytics')) return 'manager';
    if (pathname.includes('/profile') || pathname.includes('/admin-tools')) return 'profile';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = React.useState(() => getCurrentTab());

  // Update tab when pathname changes
  React.useEffect(() => {
    const newTab = (() => {
      if (pathname.includes('/leaderboard')) return 'leaderboard';
      if (pathname.includes('/manager') || pathname.includes('/lead-history') || 
          pathname.includes('/manage-teams') || pathname.includes('/analytics')) return 'manager';
      if (pathname.includes('/profile') || pathname.includes('/admin-tools')) return 'profile';
      return 'dashboard';
    })();
    setCurrentTab(newTab);
  }, [pathname]);

  const contextValue = React.useMemo<BottomNavContextType>(
    () => ({ currentTab, setCurrentTab }),
    [currentTab, setCurrentTab]
  );

  return (
    <BottomNavContext.Provider value={contextValue}>
      <div
        style={{
          "--bottom-nav-height": BOTTOM_NAV_HEIGHT,
          ...style,
        } as React.CSSProperties}
        className={cn("relative w-full", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    </BottomNavContext.Provider>
  );
});
BottomNavProvider.displayName = "BottomNavProvider";

const BottomNav = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"nav">
>(({ className, children, ...props }, ref) => {
  return (
    <nav
      ref={ref}
      className={cn(
        // Fixed positioning with iOS-style backdrop blur
        "fixed bottom-0 left-0 right-0 z-40 h-[--bottom-nav-height]",
        // iOS-specific styling with enhanced glass effect
        "bg-white/85 dark:bg-slate-950/85 ios-backdrop-blur",
        // iOS 17 style ultra subtle hairline border
        "border-t border-gray-200/25 dark:border-gray-800/25",
        // Safe area support for devices with home indicator
        "pb-safe-bottom",
        // Smooth slide up animation on mount
        "animate-in slide-in-from-bottom-2 duration-300",
        className
      )}
      style={{
        // Ensure proper layering above content
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
      {...props}
    >
      {children}
    </nav>
  );
});
BottomNav.displayName = "BottomNav";

const BottomNavContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-around w-full h-full px-1", // Equal spacing for items
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
BottomNavContent.displayName = "BottomNavContent";

const bottomNavItemVariants = cva(
  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-h-[44px] min-w-[60px] transition-all duration-200 ease-out outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 ios-button haptic-button bottom-nav-item ios-focus relative group",
  {
    variants: {
      variant: {
        default: "text-gray-500/90 dark:text-gray-400/90 hover:text-gray-700 dark:hover:text-gray-300",
        active: "text-[#007AFF] dark:text-[#0A84FF] scale-105 ios-bounce active",
      },
      size: {
        default: "gap-1",
        compact: "gap-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const BottomNavItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    icon?: React.ReactNode;
    label?: string;
    href?: string;
    badge?: number;
  } & VariantProps<typeof bottomNavItemVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      icon,
      label,
      href,
      badge,
      className,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const haptic = useHapticFeedback();
    const activeVariant = isActive ? "active" : variant;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // iOS-style haptic feedback
      haptic.selection();
      onClick?.(e);
    };

    const content = (
      <>
        {icon && (
          <div className="relative flex items-center justify-center bottom-nav-icon">
            <div className="[&>svg]:size-[22px] [&>svg]:shrink-0 [&>svg]:stroke-[1.5px] transition-all duration-200 group-hover:scale-110">
              {icon}
            </div>
            {/* iOS-style notification badge */}
            {badge && badge > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full flex items-center justify-center border border-white dark:border-slate-950 shadow-sm bottom-nav-badge">
                <span className="text-white text-[9px] font-bold leading-none">
                  {badge > 99 ? '99' : badge}
                </span>
              </div>
            )}
          </div>
        )}
        {label && (
          <span className="text-[10px] leading-tight tracking-tight truncate max-w-[70px] font-medium transition-all duration-200 group-hover:font-semibold bottom-nav-label">
            {label}
          </span>
        )}
        {children}
      </>
    );

    if (href && !asChild) {
      return (
        <Link href={href} className="contents">
          <button
            ref={ref}
            className={cn(bottomNavItemVariants({ variant: activeVariant, size }), className)}
            onClick={handleClick}
            {...props}
          >
            {content}
          </button>
        </Link>
      );
    }

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(bottomNavItemVariants({ variant: activeVariant, size }), className)}
        onClick={handleClick}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
BottomNavItem.displayName = "BottomNavItem";

export {
  BottomNav,
  BottomNavProvider,
  BottomNavContent,
  BottomNavItem,
  useBottomNav,
};

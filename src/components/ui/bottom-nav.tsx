"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/lib/haptic-feedback";
import { useAuth } from "@/hooks/use-auth";

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
        // Clean, iOS-native positioning with iPhone-specific safe area
        "fixed left-0 right-0 z-[1000]",
        // iPhone-specific bottom positioning - optimized for newer models
        "bottom-[env(safe-area-inset-bottom)] sm:bottom-0", 
        // Enhanced iOS heights with safe area
        "h-[66px] sm:h-16",
        // Enhanced padding for iPhone safe area
        "pb-[calc(env(safe-area-inset-bottom)+10px)] sm:pb-safe-bottom",
        // Enhanced iOS glass morphism with modern blur
        "bg-black/88 backdrop-blur-[24px] border-t border-white/15",
        // Smooth entrance animation
        "animate-in slide-in-from-bottom-2 duration-300",
        className
      )}
      style={{
        // Enhanced iOS 17+ blur effect with saturation and brightness
        backdropFilter: "blur(24px) saturate(200%) brightness(110%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%) brightness(110%)",
        // Enhanced shadow depth for modern iOS look
        boxShadow: `
          0 -1px 0 rgba(255, 255, 255, 0.1) inset,
          0 -8px 32px rgba(0, 0, 0, 0.4),
          0 -2px 8px rgba(0, 0, 0, 0.2)
        `,
        // iPhone-specific bottom positioning for home indicator
        bottom: "calc(env(safe-area-inset-bottom, 34px) + 16px)",
        ...({} as React.CSSProperties),
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
        // iOS-standard layout with proper spacing
        "flex items-center justify-around w-full h-full px-4 pt-1",
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
  // Enhanced base styles with iOS 17+ touch targets and animations
  "flex flex-col items-center justify-center gap-1 px-3 py-3 min-h-[48px] min-w-[64px] transition-all duration-200 ease-out outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 rounded-lg relative group",
  {
    variants: {
      variant: {
        default: "text-white/60 hover:text-white/85",
        active: "text-[#0A84FF] scale-105",
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
  HTMLElement,
  {
    asChild?: boolean;
    isActive?: boolean;
    icon?: React.ReactNode;
    label?: string;
    href?: string;
    badge?: number;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    children?: React.ReactNode;
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
    const router = useRouter();
    const activeVariant = isActive ? "active" : variant;

    const handleClick = (e: React.MouseEvent) => {
      // Enhanced iOS-style haptic feedback
      haptic.light();
      
      // If we have an href and it's not asChild, use router navigation for better performance
      if (href && !asChild) {
        e.preventDefault();
        router.push(href);
      }
      
      onClick?.(e);
    };

    const content = (
      <>
        {icon && (
          <div className={cn(
            "relative flex items-center justify-center transition-transform duration-200 ease-out",
            isActive && "scale-110"
          )}>
            <div className="[&>svg]:size-[26px] [&>svg]:shrink-0 [&>svg]:stroke-[1.75px] transition-transform duration-150 ease-out group-active:scale-95">
              {icon}
            </div>
            {/* iOS-native notification badge */}
            {badge && badge > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FF3B30] rounded-full flex items-center justify-center border-2 border-black shadow-lg">
                <span className="text-white text-[10px] font-bold leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              </div>
            )}
          </div>
        )}
        {label && (
          <span className={cn(
            "text-[11px] leading-tight font-medium transition-all duration-200 ease-out text-center max-w-[70px] truncate mt-0.5",
            isActive && "font-semibold"
          )}>
            {label}
          </span>
        )}
        {children}
      </>
    );

    if (href && !asChild) {
      return (
        <Link 
          href={href} 
          className={cn(bottomNavItemVariants({ variant: activeVariant, size }), className)}
          onClick={handleClick}
        >
          {content}
        </Link>
      );
    }

    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref as any}
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

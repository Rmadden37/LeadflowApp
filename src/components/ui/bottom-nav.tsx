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
        // Clean, iOS-native positioning
        "fixed bottom-0 left-0 right-0 z-[1000]",
        // Proper iOS heights with safe area
        "h-20 pb-safe-bottom",
        // Simplified iOS glass morphism
        "bg-black/80 backdrop-blur-xl border-t border-white/10",
        // Smooth entrance animation
        "animate-in slide-in-from-bottom-2 duration-300",
        className
      )}
      style={{
        // Native iOS blur effect
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
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
  // Base styles with iOS-native touch targets and animations
  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-[44px] min-w-[60px] transition-all duration-200 ease-out outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 rounded-lg relative group",
  {
    variants: {
      variant: {
        default: "text-white/60 hover:text-white/80",
        active: "text-white scale-105",
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
      // iOS-style haptic feedback
      haptic.selection();
      
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
            <div className="[&>svg]:size-[24px] [&>svg]:shrink-0 [&>svg]:stroke-[1.5px] transition-transform duration-150 ease-out group-active:scale-95">
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

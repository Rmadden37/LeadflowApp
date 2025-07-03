'use client';

import React, { useEffect, Component, ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { BadgeServiceInitializer } from "@/components/badge-service-initializer";

// Define proper types for ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Enhanced Error Boundary with proper TypeScript syntax
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: undefined,
      errorInfo: undefined
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Log the error but don't crash for known issues
    if (error.message.includes('serviceWorker') || 
        error.message.includes('navigator') ||
        error.message.includes('Firebase') ||
        error.message.includes('messaging')) {
      console.warn('Non-critical error caught by boundary:', error.message);
      return { hasError: false }; // Don't break the app for these errors
    }

    console.error('🚨 Critical error caught by boundary:', error);
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('🚨 Error Boundary Details:', { error, errorInfo });
    this.setState({ errorInfo });
  }

  private handleTryAgain = (): void => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="space-y-2">
              <button 
                onClick={this.handleTryAgain}
                className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className="block w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.ReactElement {
  useEffect(() => {
    // Enhanced global error handling
    const handleError = (event: ErrorEvent): void => {
      const errorMessage = event.error?.message || event.message || 'Unknown error';
      
      // Handle service worker related errors gracefully
      if (errorMessage.includes('serviceWorker') || 
          errorMessage.includes('navigator.serviceWorker') ||
          errorMessage.includes('addEventListener')) {
        console.warn('ServiceWorker error handled gracefully:', errorMessage);
        event.preventDefault();
        return;
      }

      // Handle Firebase messaging errors gracefully
      if (errorMessage.includes('Firebase') || 
          errorMessage.includes('messaging') ||
          errorMessage.includes('unsupported-browser')) {
        console.warn('Firebase messaging error handled gracefully:', errorMessage);
        event.preventDefault();
        return;
      }

      // Log other errors but don't break the app
      console.error('🚨 Global JavaScript Error:', {
        message: errorMessage,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason?.message || event.reason || 'Unknown rejection';
      
      // Handle Firebase messaging promise rejections
      if (typeof reason === 'string' && (
          reason.includes('messaging/unsupported-browser') ||
          reason.includes('serviceWorker') ||
          reason.includes('Firebase'))) {
        console.warn('Firebase/ServiceWorker promise rejection handled gracefully:', reason);
        event.preventDefault();
        return;
      }

      console.error('🚨 Unhandled Promise Rejection:', reason);
    };

    // Viewport height handling for mobile
    const setViewportHeight = (): void => {
      try {
        if (typeof window !== 'undefined') {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
      } catch (error) {
        console.warn('Failed to set viewport block-size:', error);
      }
    };

    // iOS Safari specific handling
    const handleIOSViewport = (): void => {
      if (typeof window !== 'undefined' && 
          typeof navigator !== 'undefined' && 
          /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        setTimeout(setViewportHeight, 100);
      } else {
        setViewportHeight();
      }
    };

    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Initial setup
    setViewportHeight();
    
    // Event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('resize', handleIOSViewport);
    window.addEventListener('orientationchange', handleIOSViewport);
    
    // Cleanup function
    return (): void => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('resize', handleIOSViewport);
        window.removeEventListener('orientationchange', handleIOSViewport);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen flex flex-col"
        style={{
          paddingBlockStart: 'env(safe-area-inset-top)',
          paddingBlockEnd: 'env(safe-area-inset-bottom)',
          paddingInlineStart: 'env(safe-area-inset-left)',
          paddingInlineEnd: 'env(safe-area-inset-right)',
          minBlockSize: '100dvh',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'system']}
        >
          <AuthProvider>
            <BadgeServiceInitializer />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </div>
    </ErrorBoundary>
  );
}
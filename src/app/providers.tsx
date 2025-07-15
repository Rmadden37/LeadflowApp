'use client';

import { useEffect, Component, ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

// Define proper types for ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
}

// Enhanced Error Boundary with better error categorization
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const errorMessage = error?.message || 'Unknown error';
      const errorStack = error?.stack || '';
      
      // Categorize non-critical errors that shouldn't break the app
      const nonCriticalPatterns = [
        'serviceWorker',
        'navigator',
        'Firebase',
        'messaging',
        'ChunkLoadError',
        'Loading chunk',
        'ResizeObserver',
        'Non-Error promise rejection',
        'Script error',
        'Network request failed',
        'auth/network-request-failed',
        'auth/internal-error',
      ];

      const isNonCritical = nonCriticalPatterns.some(pattern => 
        errorMessage.includes(pattern) || errorStack.includes(pattern)
      );

      if (isNonCritical) {
        console.warn(`⚠️ Non-critical error caught and handled [${errorId}]:`, {
          message: errorMessage,
          type: 'non-critical',
          errorId
        });
        return { hasError: false, errorId }; // Don't break the app
      }

      // Critical errors that should be displayed
      console.error(`🚨 Critical error caught by boundary [${errorId}]:`, {
        message: errorMessage,
        stack: errorStack,
        name: error?.name,
        type: 'critical',
        errorId
      });
      
      return { 
        hasError: true, 
        error,
        errorId
      };
    } catch (boundaryError) {
      // Fallback if error handling itself fails
      console.error(`🚨 Error Boundary itself failed [${errorId}]:`, boundaryError);
      return { 
        hasError: true, 
        error: new Error('Error boundary failure'),
        errorId
      };
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Enhanced error logging with context
    try {
      const errorContext = {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        errorId: this.state.errorId
      };

      console.error(`🚨 Error Boundary Details [${this.state.errorId}]:`, errorContext);
      
      this.setState({ errorInfo });
      
    } catch (loggingError) {
      // Fallback if logging fails
      console.error('🚨 Error Boundary caught error:', error.message);
      console.error('🚨 Component stack:', errorInfo.componentStack);
      this.setState({ errorInfo });
    }
  }

  private handleTryAgain = (): void => {
    console.log(`🔄 Attempting to recover from error [${this.state.errorId}]`);
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: '',
    });
  };

  private handleReload = (): void => {
    console.log(`🔄 Reloading application due to error [${this.state.errorId}]`);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleReportError = (): void => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
    };

    // Copy error details to clipboard for easy reporting
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
          .then(() => {
            console.log('✅ Error details copied to clipboard');
            alert('Error details copied to clipboard. Please send this to support.');
          })
          .catch(() => {
            console.log('❌ Failed to copy error details');
            alert(`Error ID: ${this.state.errorId}\nPlease report this to support.`);
          });
      } catch (clipboardError) {
        console.log('❌ Clipboard API not available or blocked');
        alert(`Error ID: ${this.state.errorId}\nPlease report this to support.`);
      }
    } else {
      alert(`Error ID: ${this.state.errorId}\nPlease report this to support.`);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.includes('auth') || 
                         this.state.error?.stack?.includes('auth');
      
      const isNetworkError = this.state.error?.message?.includes('network') || 
                            this.state.error?.message?.includes('fetch') ||
                            this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center p-8 max-w-md w-full bg-card rounded-lg border border-border shadow-lg">
            {/* Error Icon and Title */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-destructive mb-2">
                {isAuthError ? 'Authentication Error' : 
                 isNetworkError ? 'Connection Error' : 
                 'Something went wrong'}
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <p className="text-muted-foreground mb-2">
                {isAuthError ? 'There was a problem with authentication. Please try logging in again.' :
                 isNetworkError ? 'Unable to connect to our servers. Please check your internet connection.' :
                 this.state.error?.message || 'An unexpected error occurred while loading the application.'}
              </p>
              
              <p className="text-xs text-muted-foreground/60">
                Error ID: {this.state.errorId}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={this.handleTryAgain}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Try Again
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Reload App
                </button>
                
                <button 
                  onClick={this.handleReportError}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Report Error
                </button>
              </div>
            </div>

            {/* Additional Help */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                If this problem persists, try clearing your browser cache or contact support.
              </p>
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
    // Enhanced global error handling with better categorization
    const handleError = (event: ErrorEvent): void => {
      try {
        const errorMessage = event.error?.message || event.message || 'Unknown error';
        const filename = event.filename || 'unknown';
        
        // Define patterns for errors we want to handle gracefully
        const gracefulErrorPatterns = [
          'serviceWorker',
          'navigator.serviceWorker',
          'addEventListener',
          'ChunkLoadError',
          'Loading chunk',
          'Script error',
          'ResizeObserver',
          'Non-Error promise rejection',
          'Firebase',
          'messaging',
          'unsupported-browser',
        ];

        const shouldHandleGracefully = gracefulErrorPatterns.some(pattern => 
          errorMessage.includes(pattern) || filename.includes(pattern)
        );

        if (shouldHandleGracefully) {
          console.warn('⚠️ Global error handled gracefully:', {
            message: errorMessage,
            filename,
            type: 'graceful'
          });
          event.preventDefault();
          return;
        }

        // Log other errors for debugging but don't break the app
        console.error('🚨 Global JavaScript Error:', {
          message: errorMessage,
          filename,
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          stack: event.error?.stack || 'No stack trace',
          timestamp: new Date().toISOString()
        });
      } catch (handlerError) {
        console.error('🚨 Error handler itself failed:', handlerError);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      try {
        const reason = event.reason?.message || event.reason || 'Unknown rejection';
        
        // Handle specific promise rejections gracefully
        const gracefulRejectionPatterns = [
          'messaging/unsupported-browser',
          'serviceWorker',
          'Firebase',
          'ChunkLoadError',
          'Loading chunk',
          'Script error',
          'auth/network-request-failed',
          'Network request failed',
        ];

        const shouldHandleGracefully = gracefulRejectionPatterns.some(pattern => 
          typeof reason === 'string' && reason.includes(pattern)
        );

        if (shouldHandleGracefully) {
          console.warn('⚠️ Promise rejection handled gracefully:', {
            reason: typeof reason === 'string' ? reason : JSON.stringify(reason),
            type: 'graceful'
          });
          event.preventDefault();
          return;
        }

        console.error('🚨 Unhandled Promise Rejection:', {
          reason: typeof reason === 'string' ? reason : JSON.stringify(reason, null, 2),
          timestamp: new Date().toISOString()
        });
      } catch (handlerError) {
        console.error('🚨 Promise rejection handler failed:', handlerError);
      }
    };

    // Enhanced viewport height handling
    const setViewportHeight = (): void => {
      try {
        if (typeof window !== 'undefined') {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
          
          // Also set app height for mobile
          document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to set viewport height:', error);
      }
    };

    // iOS Safari and mobile-specific handling
    const handleMobileViewport = (): void => {
      if (typeof window === 'undefined') return;
      
      try {
        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIOS) {
          // iOS specific handling
          setTimeout(() => {
            setViewportHeight();
          }, 100);
        } else {
          setViewportHeight();
        }
      } catch (error) {
        console.warn('⚠️ Mobile viewport handling failed:', error);
        setViewportHeight(); // Fallback
      }
    };

    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Initial setup
    setViewportHeight();
    
    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('resize', handleMobileViewport);
    window.addEventListener('orientationchange', handleMobileViewport);
    
    // Cleanup function
    return (): void => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('resize', handleMobileViewport);
        window.removeEventListener('orientationchange', handleMobileViewport);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <div
        className="min-h-screen flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          minHeight: 'calc(var(--vh, 1vh) * 100)',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </div>
    </ErrorBoundary>
  );
}
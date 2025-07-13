import { Inter, Lora } from "next/font/google";
import "./globals.css";
import "../styles/performance-optimizations.css";
import "../styles/aurelian-ios-performance-extreme.css";
import "../styles/ios-avatar-fix.css";
import { Providers } from "./providers";
import type { Metadata, Viewport } from 'next';

// PREMIUM PERFORMANCE: Preload critical fonts with optimized loading
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
});
const lora = Lora({ 
  subsets: ["latin"], 
  variable: '--font-lora',
  display: 'swap',
});

// PREMIUM PERFORMANCE: Add critical CSS inlining
const criticalCSS = `
  /* Critical iOS optimizations loaded immediately */
  * { 
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    touch-action: manipulation;
  }
  body { 
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    transform: translateZ(0);
  }
  .ultra-responsive {
    transition: transform 0.05s ease-out;
    transform: translateZ(0);
  }
  .ultra-responsive:active {
    transform: scale(0.97) translateZ(0);
  }
`;

export const metadata: Metadata = {
  title: 'LeadFlow',
  description: 'Your LeadFlow application',
  applicationName: 'LeadFlow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LeadFlow',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileImage': '/icon-192x192.png',
    'msapplication-TileColor': '#2DD4BF',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F1419', // Force dark theme always
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PREMIUM PERFORMANCE: Critical CSS injection */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* CRITICAL: Ultra-responsive touch for premium feel */
            * { 
              -webkit-tap-highlight-color: transparent !important;
              -webkit-touch-callout: none !important;
              touch-action: manipulation !important;
            }
            body { 
              overscroll-behavior: none !important;
              -webkit-overflow-scrolling: touch !important;
              transform: translateZ(0) !important;
            }
            .ultra-responsive {
              transition: transform 0.05s ease-out !important;
              transform: translateZ(0) !important;
            }
            .ultra-responsive:active {
              transform: scale(0.97) translateZ(0) !important;
            }
            .hw-accelerated {
              transform: translateZ(0) !important;
              will-change: transform !important;
              backface-visibility: hidden !important;
            }
          `
        }} />
        
        {/* Force dark mode meta tags */}
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0F1419" />
        <meta name="msapplication-navbutton-color" content="#0F1419" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* PREMIUM: Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preload critical fonts to prevent layout shifts and flashes of unstyled text */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Complete Dark Mode Enforcement - Always Dark
            (function() {
              // Immediately apply dark mode to prevent any light flash
              const html = document.documentElement;
              const body = document.body;
              
              // Force dark mode styling
              html.classList.add('dark');
              html.setAttribute('data-theme', 'dark');
              html.style.backgroundColor = '#0D0D0D';
              html.style.color = '#FFFFFF';
              html.style.colorScheme = 'dark';
              
              // Ensure body gets styled too
              if (body) {
                body.style.backgroundColor = '#0D0D0D';
                body.style.color = '#FFFFFF';
              }
              
              console.log('🌙 Dark mode enforced - LeadFlow is always dark');
            })();
          `
        }} />
      </head>
      <body className={`${inter.className} ${lora.variable} font-body antialiased bg-background text-foreground min-h-screen dark ios-optimized dashboard-safe-content`}>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Global error handler to prevent keyboard dismissal
            window.addEventListener('error', function(e) {
              console.warn('Caught error:', e.error);
              e.preventDefault();
              return true;
            });
            window.addEventListener('unhandledrejection', function(e) {
              console.warn('Caught unhandled rejection:', e.reason);
              e.preventDefault();
              return true;
            });
          `
        }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
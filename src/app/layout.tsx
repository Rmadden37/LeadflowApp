import { Inter, Lora } from "next/font/google";
import "./globals.css";
import "../styles/performance-optimizations.css";
import "../styles/aurelian-ios-performance-extreme.css";
import "../styles/ios-theme-fix.css";
import "../styles/ios-avatar-fix.css";
import "../styles/atmospheric-login.css";
import { Providers } from "./providers";
import type { Metadata, Viewport } from 'next';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
});
const lora = Lora({ 
  subsets: ["latin"], 
  variable: '--font-lora',
  display: 'swap',
});

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
        {/* Force dark mode meta tags */}
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0F1419" />
        <meta name="msapplication-navbutton-color" content="#0F1419" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
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
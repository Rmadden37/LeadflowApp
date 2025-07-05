import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import UniversalNavigationWrapper from "@/components/universal-navigation-wrapper";
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ["latin"] });
const lora = Lora({ subsets: ["latin"], variable: '--font-lora' });

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2DD4BF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1419' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical fonts to prevent layout shifts and flashes of unstyled text */}
        <link
          rel="preload"
          href={`https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZJhiI2B.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={`https://fonts.gstatic.com/s/lora/v35/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkq18m9KZ0Mv.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} ${lora.variable} font-body antialiased bg-background text-foreground min-h-screen`}>
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
        <Providers>
          <UniversalNavigationWrapper>
            {children}
          </UniversalNavigationWrapper>
        </Providers>
      </body>
    </html>
  );
}
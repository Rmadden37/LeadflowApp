import { Inter, Lora } from "next/font/google";
import "./globals.css";
import "../styles/performance-optimizations.css";
import "../styles/aurelian-ios-performance-extreme.css";
import "../styles/ios-avatar-fix.css";
import "../styles/iphone-bottom-nav-fix.css";
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
  themeColor: '#0F1419',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            body { 
              background-color: #0D0D0D;
              color: #FFFFFF;
            }
          `
        }} />
      </head>
      <body className={`${inter.className} ${lora.variable} antialiased bg-background text-foreground min-h-screen dark`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

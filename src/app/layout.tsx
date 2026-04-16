import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import ErrorBoundary from '@/components/ErrorBoundary';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SOS — Spiritual Operating System',
  description: 'Your daily guidance, decoded from the cosmos.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SOS',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegistrar />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

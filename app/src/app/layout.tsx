import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s — STASH',
    default: 'STASH — Money Management for Gen Z',
  },
  description: 'STASH is a simple, privacy-first money management app built for Gen Z. Track spending, build savings goals, and understand where your money goes.',
  keywords: ['personal finance', 'savings', 'budgeting', 'fintech', 'gen z finance', 'money management app', 'privacy first finance tracker'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://stash.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'STASH',
  },
  openGraph: {
    title: 'STASH — Money Management for Gen Z',
    description: 'STASH is a simple, privacy-first money management app built for Gen Z. Track spending, build savings goals, and understand where your money goes.',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'STASH - Money Management for Gen Z',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STASH — Money Management for Gen Z',
    description: 'STASH is a simple, privacy-first money management app built for Gen Z. Track spending, build savings goals, and understand where your money goes.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#CAFD00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Respect the iPhone notch / home indicator
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts to cut latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={[
          spaceGrotesk.variable,
          plusJakarta.variable,
          // pb-20 = 80px — gives 12px breathing room above the 68px nav bar
          // pb-[calc(68px+env(safe-area-inset-bottom))] would be ideal but
          // Tailwind JIT can't compute env() at build time, so we handle it
          // in globals.css with the .bottom-nav-safe class on the nav
          'bg-background text-on-background min-h-screen pb-20 overflow-x-hidden font-body',
        ].join(' ')}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
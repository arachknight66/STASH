import type { Metadata } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
});

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: 'STASH – Smart Personal Finance',
  description: 'Track spending, hit savings goals, and get AI-powered financial intel. STASH is your money, interpreted.',
  keywords: ['personal finance', 'savings', 'budgeting', 'fintech'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'STASH',
  },
  openGraph: {
    title: 'STASH – Smart Personal Finance',
    description: 'Track spending, hit savings goals, and get AI-powered financial intel.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#CCFF00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${spaceGrotesk.variable} ${plusJakarta.variable} bg-background text-on-background min-h-screen pb-24 overflow-x-hidden font-body`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

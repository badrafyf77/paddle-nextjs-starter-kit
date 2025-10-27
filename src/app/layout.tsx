import { Inter } from 'next/font/google';
import '../styles/globals.css';
import '../styles/layout.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://paddle-billing.vercel.app'),
  title: 'Jobora - AI-Powered Job Search Platform',
  description:
    'Land your dream job faster with Jobora. AI-powered job search with auto-apply, real-time voice interview practice, and personalized resumes that match your unique writing style.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={'min-h-full dark scroll-smooth'}>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

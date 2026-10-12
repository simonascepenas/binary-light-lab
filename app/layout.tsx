import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Binary Light Lab | AI Principles & Applications',
  description: 'Separate binary tests for numbers, words, and sentences, plus a text-to-lamps converter.',
  metadataBase: new URL('https://binary-light-lab.workspace-404564.chatgpt.site'),
  openGraph: {
    title: 'Binary Light Lab',
    description: 'Switch on. Decode.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Binary Light Lab',
    description: 'Switch on. Decode.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    template: '%s | CampusFlow',
    default: 'CampusFlow — Campus Productivity Platform',
  },
  description:
    'CampusFlow is a production-grade, multi-tenant campus productivity platform for students, teachers, parents, and college administrators.',
  keywords: ['campus', 'productivity', 'attendance', 'tasks', 'study', 'university'],
  authors: [{ name: 'CampusFlow' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CampusFlow',
  },
  openGraph: {
    type: 'website',
    siteName: 'CampusFlow',
    title: 'CampusFlow — Campus Productivity Platform',
    description: 'All-in-one campus productivity platform for students, teachers, parents and admins.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(220, 20%, 97%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(222, 47%, 6%)' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

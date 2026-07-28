import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    template: '%s | CampusCore',
    default: 'CampusCore — The Connected Campus Platform',
  },
  description:
    'CampusCore is a production-grade, multi-tenant campus productivity platform for students, teachers, parents, and college administrators.',
  keywords: ['campus', 'productivity', 'attendance', 'tasks', 'study', 'university', 'campuscore'],
  authors: [{ name: 'CampusCore' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CampusCore',
  },
  openGraph: {
    type: 'website',
    siteName: 'CampusCore',
    title: 'CampusCore — The Connected Campus Platform',
    description: 'All-in-one connected campus platform for students, teachers, parents and admins.',
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

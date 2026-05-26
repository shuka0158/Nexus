import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://nexus-future.web.app'),
  title: 'NEXUS — Productivity OS',
  description: 'NEXUS is an all-in-one productivity platform: calendar with Google sync, tasks (Kanban + list), habits, goals, notes, pomodoro timer, and a built-in AI assistant. Free, installable as a PWA, dark-mode native.',
  keywords: ['productivity app', 'calendar', 'tasks', 'todo', 'kanban', 'pomodoro', 'habits', 'goals', 'notes', 'PWA', 'google calendar sync', 'AI assistant'],
  authors: [{ name: 'shuka0158' }],
  manifest: '/manifest.json',
  alternates: { canonical: 'https://nexus-future.web.app/' },
  robots: { index: true, follow: true },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'NEXUS — Productivity OS',
    description: 'All-in-one productivity: calendar, tasks, habits, goals, notes, pomodoro, AI assistant. Free PWA.',
    type: 'website',
    url: 'https://nexus-future.web.app/',
    siteName: 'NEXUS',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512, alt: 'NEXUS' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXUS — Productivity OS',
    description: 'All-in-one productivity: calendar, tasks, habits, goals, notes, pomodoro, AI assistant. Free PWA.',
    images: ['/icons/icon-512x512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NEXUS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050507',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans bg-dark-900 text-white antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    background: 'rgba(15,15,30,0.95)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                  },
                }}
              />
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NEXUS — Productivity OS',
  description: 'A futuristic cyberpunk productivity platform. Manage your calendar, tasks, reminders and more.',
  keywords: ['productivity', 'calendar', 'tasks', 'pomodoro', 'cyberpunk', 'PWA'],
  authors: [{ name: 'NEXUS' }],
  manifest: '/manifest.json',
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
    description: 'A futuristic cyberpunk productivity platform',
    type: 'website',
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

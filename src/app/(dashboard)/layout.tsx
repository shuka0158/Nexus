'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hadSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to /login if auth is fully resolved AND there's no saved session hint.
    // Skipping the hadSession check would briefly flash /login during Firebase bootstrap.
    if (!loading && !user && !hadSession) {
      router.replace('/login');
    }
  }, [user, loading, hadSession, router]);

  // While loading, OR while we still expect a session to be restored, show the NEXUS splash —
  // never the login form.
  if (loading || (!user && hadSession)) return <LoadingScreen />;
  if (!user) return null;
  return <>{children}</>;
}

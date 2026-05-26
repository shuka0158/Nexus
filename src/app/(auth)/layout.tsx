'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hadSession } = useAuth();
  const router = useRouter();

  // If user is (or is being) restored, bounce to dashboard instead of showing the login form
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || hadSession || user) return <LoadingScreen />;
  return <>{children}</>;
}

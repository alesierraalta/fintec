'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';

interface RouteAwareProvidersProps {
  children: ReactNode;
}

function shouldBypassAppProviders(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  // Root path bypass: landing renders at "/" for unauthenticated users.
  // When "/" renders dashboard (authenticated), providers are mounted
  // locally via LocalProvidersForRootDashboard in app/page.tsx.
  return (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname.startsWith('/landing/')
  );
}

export function RouteAwareProviders({ children }: RouteAwareProvidersProps) {
  const pathname = usePathname();

  const reducedMotionSetting =
    process.env.NODE_ENV === 'development' ? 'never' : 'user';

  if (shouldBypassAppProviders(pathname)) {
    return (
      <MotionConfig reducedMotion={reducedMotionSetting}>
        {children}
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion={reducedMotionSetting}>
      <AuthProvider>
        <RepositoryProvider>{children}</RepositoryProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

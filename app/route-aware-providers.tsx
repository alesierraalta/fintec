'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MotionConfig reducedMotion={reducedMotionSetting}>
          {children}
        </MotionConfig>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion={reducedMotionSetting}>
        <AuthProvider>
          <RepositoryProvider>{children}</RepositoryProvider>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';

interface RouteAwareProvidersProps {
  children: ReactNode;
}

function shouldBypassAppProviders(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === '/landing' || pathname.startsWith('/landing/');
}

export function RouteAwareProviders({ children }: RouteAwareProvidersProps) {
  const pathname = usePathname();

  if (shouldBypassAppProviders(pathname)) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <RepositoryProvider>{children}</RepositoryProvider>
    </AuthProvider>
  );
}

'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { NativeOAuthListener } from '@/components/providers/native-oauth-listener';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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

  if (shouldBypassAppProviders(pathname)) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <NativeOAuthListener>
            <RepositoryProvider>
              <SubscriptionProvider>{children}</SubscriptionProvider>
            </RepositoryProvider>
          </NativeOAuthListener>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

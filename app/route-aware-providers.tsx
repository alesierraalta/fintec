'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { AdminAccessProvider } from '@/contexts/admin-access-context';
import { RepositoryProvider } from '@/providers';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { NativeOAuthListener } from '@/components/providers/native-oauth-listener';
import { FinancialRealtimeSync } from '@/components/providers/financial-realtime-sync';
import { AppUpdateNotifier } from '@/components/app/app-update-notifier';

interface RouteAwareProvidersProps {
  children: ReactNode;
  isAdmin?: boolean;
}

function shouldBypassAppProviders(pathname: string | null) {
  // Keep the public landing route provider-free, but keep `/` inside the
  // authenticated app provider tree. The root route can render either landing
  // or dashboard on the server; retaining providers at `/` prevents the
  // dashboard from remounting Auth/Repository/Subscription when the user
  // navigates to and from `/transactions`.
  return (
    !!pathname && (pathname === '/landing' || pathname.startsWith('/landing/'))
  );
}

export function RouteAwareProviders({
  children,
  isAdmin = false,
}: RouteAwareProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );
  const pathname = usePathname();
  const content = shouldBypassAppProviders(pathname) ? (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <AppUpdateNotifier />
      </ThemeProvider>
    </QueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <NativeOAuthListener>
            <RepositoryProvider>
              <SubscriptionProvider>
                <FinancialRealtimeSync />
                {children}
                <AppUpdateNotifier />
              </SubscriptionProvider>
            </RepositoryProvider>
          </NativeOAuthListener>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return <AdminAccessProvider isAdmin={isAdmin}>{content}</AdminAccessProvider>;
}

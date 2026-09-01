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
interface RouteAwareProvidersProps { children: ReactNode; isAdmin: boolean; }
function shouldBypassAppProviders(pathname: string | null) { return !!pathname && (pathname === '/' || pathname === '/landing' || pathname.startsWith('/landing/')); }
export function RouteAwareProviders({ children, isAdmin }: RouteAwareProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }));
  const pathname = usePathname();
  const content = shouldBypassAppProviders(pathname) ? <QueryClientProvider client={queryClient}><ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider></QueryClientProvider> : <QueryClientProvider client={queryClient}><ThemeProvider attribute="class" defaultTheme="system" enableSystem><AuthProvider><NativeOAuthListener><RepositoryProvider><SubscriptionProvider><FinancialRealtimeSync />{children}</SubscriptionProvider></RepositoryProvider></NativeOAuthListener></AuthProvider></ThemeProvider></QueryClientProvider>;
  return <AdminAccessProvider isAdmin={isAdmin}>{content}</AdminAccessProvider>;
}

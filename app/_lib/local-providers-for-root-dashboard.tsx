'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { FinancialRealtimeSync } from '@/components/providers/financial-realtime-sync';

interface LocalProvidersForRootDashboardProps {
  children: React.ReactNode;
}

/**
 * Local providers wrapper for the root dashboard branch.
 *
 * When `/` renders dashboard (authenticated), RouteAwareProviders bypasses
 * providers for the `/` path. This component re-mounts them locally so the
 * dashboard tree has access to auth, repository, and subscription context.
 *
 * When `/` renders landing (unauthenticated), this component is NOT rendered,
 * keeping the landing bundle free of auth/repository/subscription code (NFR4).
 */
export function LocalProvidersForRootDashboard({
  children,
}: LocalProvidersForRootDashboardProps) {
  return (
    <AuthProvider>
      <RepositoryProvider>
        <SubscriptionProvider>
            <FinancialRealtimeSync />
            {children}
          </SubscriptionProvider>
      </RepositoryProvider>
    </AuthProvider>
  );
}

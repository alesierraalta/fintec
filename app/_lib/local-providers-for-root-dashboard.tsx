'use client';

import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/contexts/auth-context';
import { RepositoryProvider } from '@/providers';

interface LocalProvidersForRootDashboardProps {
  children: React.ReactNode;
}

/**
 * Local providers wrapper for the root dashboard branch.
 *
 * When `/` renders dashboard (authenticated), RouteAwareProviders bypasses
 * providers for the `/` path. This component re-mounts them locally so the
 * dashboard tree has access to auth and repository context.
 *
 * When `/` renders landing (unauthenticated), this component is NOT rendered,
 * keeping the landing bundle free of auth/repository code (NFR4).
 */
export function LocalProvidersForRootDashboard({
  children,
}: LocalProvidersForRootDashboardProps) {
  const reducedMotionSetting =
    process.env.NODE_ENV === 'development' ? 'never' : 'user';

  return (
    <MotionConfig reducedMotion={reducedMotionSetting}>
      <AuthProvider>
        <RepositoryProvider>{children}</RepositoryProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

'use client';

interface LocalProvidersForRootDashboardProps {
  children: React.ReactNode;
}

/**
 * Legacy compatibility wrapper for callers that still import this module.
 *
 * The root route now stays inside RouteAwareProviders so navigation between `/`
 * and `/transactions` keeps one Auth/Repository/Subscription/Realtime tree.
 * This component is intentionally a passthrough and must not add another tree.
 */
export function LocalProvidersForRootDashboard({
  children,
}: LocalProvidersForRootDashboardProps) {
  return children;
}

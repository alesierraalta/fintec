'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/contexts/sidebar-context';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';

// * Optimize bundle size by lazy loading device-specific dashboards
// This ensures mobile users don't download desktop code and vice versa
const MobileDashboard = dynamic(
  () => import('./mobile-dashboard').then((mod) => mod.MobileDashboard),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false // Dashboard is client-heavy, skipping SSR for these chunks saves server time
  }
);

const DesktopDashboard = dynamic(
  () => import('./desktop-dashboard').then((mod) => mod.DesktopDashboard),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

export function DashboardContent() {
  const { isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // Wait for hydration to complete
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <DashboardSkeleton />;
  }

  // Now safely render based on isMobile (client-side only)
  // The dynamic import will trigger network request for the chunk here
  if (isMobile) {
    return <MobileDashboard />;
  }

  return <DesktopDashboard />;
}


'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';
import { MobileDashboard } from './mobile-dashboard';
import { DesktopDashboard } from './desktop-dashboard';

import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';

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
  if (isMobile) {
    return <MobileDashboard />;
  }

  return <DesktopDashboard />;
}


'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { MobileDashboard } from './mobile-dashboard';
import { DesktopDashboard } from './desktop-dashboard';

export function DashboardContent() {
  const { isMobile } = useSidebar();

  if (isMobile) {
    return <MobileDashboard />;
  }

  return <DesktopDashboard />;
}


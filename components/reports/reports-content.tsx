'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { MobileReports } from './mobile-reports';
import { DesktopReports } from './desktop-reports';

export function ReportsContent() {
  const { isMobile } = useSidebar();

  if (isMobile) {
    return <MobileReports />;
  }

  return <DesktopReports />;
}

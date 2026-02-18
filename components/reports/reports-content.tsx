'use client';

import { useSyncExternalStore } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';
import { MobileReports } from './mobile-reports';
import { DesktopReports } from './desktop-reports';

import { ReportsSkeleton } from '@/components/skeletons/reports-skeleton';

const subscribe = () => () => {};

export function ReportsContent() {
  const { isMobile } = useSidebar();
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return <ReportsSkeleton />;
  }

  // Now safely render based on isMobile (client-side only)
  if (isMobile) {
    return <MobileReports />;
  }

  return <DesktopReports />;
}

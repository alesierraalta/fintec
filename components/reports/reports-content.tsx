'use client';

import { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';
import { MobileReports } from './mobile-reports';
import { DesktopReports } from './desktop-reports';

export function ReportsContent() {
  const { isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  // Wait for hydration to complete
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">
          Cargando...
        </div>
      </div>
    );
  }

  // Now safely render based on isMobile (client-side only)
  if (isMobile) {
    return <MobileReports />;
  }

  return <DesktopReports />;
}

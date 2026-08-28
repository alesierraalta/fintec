import { notFound } from 'next/navigation';
import { MobileNavigationRegressionHarness } from '@/components/testing/mobile-menu-fab-regression-harness';

export default function MobileMenuFabRegressionPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <MobileNavigationRegressionHarness />;
}

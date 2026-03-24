import { notFound } from 'next/navigation';
import { MobileMenuFabRegressionHarness } from '@/components/testing/mobile-menu-fab-regression-harness';

export default function MobileMenuFabRegressionPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <MobileMenuFabRegressionHarness />;
}

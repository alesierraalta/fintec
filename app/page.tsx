import { MainLayout } from '@/components/layout/main-layout';
import { LazyDashboardContent } from '@/components/dashboard/lazy-dashboard-content';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';

export default async function HomePage() {
  await requireAuthenticatedUser();

  return (
    <MainLayout>
      <LazyDashboardContent />
    </MainLayout>
  );
}

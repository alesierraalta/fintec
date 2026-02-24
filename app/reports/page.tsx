import { MainLayout } from '@/components/layout/main-layout';
import { LazyReportsContent } from '@/components/reports/lazy-reports-content';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';

export default async function ReportsPage() {
  await requireAuthenticatedUser();

  return (
    <MainLayout>
      <LazyReportsContent />
    </MainLayout>
  );
}

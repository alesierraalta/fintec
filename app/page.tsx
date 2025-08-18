import { MainLayout } from '@/components/layout/main-layout';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function HomePage() {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
}
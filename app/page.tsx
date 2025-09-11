import { MainLayout } from '@/components/layout/main-layout';
import { LazyDashboardContent } from '@/components/dashboard/lazy-dashboard-content';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function HomePage() {
  return (
    <AuthGuard>
      <MainLayout>
        <LazyDashboardContent />
      </MainLayout>
    </AuthGuard>
  );
}

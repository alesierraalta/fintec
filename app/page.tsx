import { MainLayout } from '@/components/layout/main-layout';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function HomePage() {
  return (
    <AuthGuard>
      <MainLayout>
        <DashboardContent />
      </MainLayout>
    </AuthGuard>
  );
}
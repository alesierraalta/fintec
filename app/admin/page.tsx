import { redirect } from 'next/navigation';
import { AdminAccessDenied } from '@/components/admin/admin-access-denied';
import { AdminStatsDashboard } from '@/components/admin/admin-stats-dashboard';
import { PageVisitsSection } from '@/components/admin/page-visits-section';
import { getAdminAccess } from '@/lib/admin/guard';

export default async function AdminPage() {
  try {
    const access = await getAdminAccess();
    if (!access.isAdmin) return <AdminAccessDenied />;
    return (
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <AdminStatsDashboard />
        <PageVisitsSection />
      </main>
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 401
    ) {
      redirect('/auth/login');
      return null;
    }
    throw error;
  }
}

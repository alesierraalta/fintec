import { MainLayout } from '@/components/layout/main-layout';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import DebtsPageClient from './debts-page-client';

export default async function DebtsPage() {
  await requireAuthenticatedUser();

  return (
    <MainLayout>
      <DebtsPageClient />
    </MainLayout>
  );
}

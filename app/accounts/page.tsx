import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import AccountsPageClient from './accounts-page-client';

export default async function AccountsPage() {
  await requireAuthenticatedUser();

  return <AccountsPageClient />;
}

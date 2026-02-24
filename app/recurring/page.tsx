import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import RecurringPageClient from './recurring-page-client';

export default async function RecurringPage() {
  await requireAuthenticatedUser();

  return <RecurringPageClient />;
}

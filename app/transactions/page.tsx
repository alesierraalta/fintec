import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import TransactionsPageClient from './transactions-page-client';

export default async function TransactionsPage() {
  await requireAuthenticatedUser();

  return <TransactionsPageClient />;
}

import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import SubscriptionPageClient from './subscription-page-client';

export default async function SubscriptionPage() {
  await requireAuthenticatedUser();

  return <SubscriptionPageClient />;
}

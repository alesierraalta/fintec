import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';
import { getSubscriptionStatusPayload } from '@/lib/supabase/subscriptions';
import SubscriptionPageClient from './subscription-page-client';

export default async function SubscriptionPage() {
  const user = await requireAuthenticatedUser();
  const initialSubscription = await getSubscriptionStatusPayload(user.id);

  return <SubscriptionPageClient initialSubscription={initialSubscription} />;
}

import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatusPayload } from '@/lib/supabase/subscriptions';
import PricingPageClient from './pricing-page-client';

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialSubscription = user
    ? await getSubscriptionStatusPayload(user.id)
    : null;

  return <PricingPageClient initialSubscription={initialSubscription} />;
}

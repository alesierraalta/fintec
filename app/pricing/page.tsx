import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatusPayload } from '@/lib/supabase/subscriptions';
import PricingPageClient from './pricing-page-client';
import { PublicPricingClient } from './public-pricing-client';

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public pricing for anonymous users — honest, no auth checkout
  if (!user) {
    return <PublicPricingClient />;
  }

  const initialSubscription = await getSubscriptionStatusPayload(user.id);
  return <PricingPageClient initialSubscription={initialSubscription} />;
}

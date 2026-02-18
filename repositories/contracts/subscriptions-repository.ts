import type {
  SubscriptionStatus,
  SubscriptionTier,
} from '@/types/subscription';

export interface UserSubscriptionSnapshot {
  id: string;
  tier: SubscriptionTier | null;
  subscriptionTier: SubscriptionTier | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionId: string | null;
}

export interface SubscriptionsRepository {
  getUserSubscriptionSnapshot(
    userId: string
  ): Promise<UserSubscriptionSnapshot | null>;
}

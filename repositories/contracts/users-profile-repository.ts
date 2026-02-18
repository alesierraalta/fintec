export interface UpsertUserProfileInput {
  id: string;
  email: string;
  name?: string | null;
  baseCurrency?: string;
}

export interface UpdateUserProfileInput {
  name?: string;
  baseCurrency?: string;
  tier?: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  subscriptionId?: string;
}

export interface UsersProfileRepository {
  upsert(input: UpsertUserProfileInput): Promise<void>;
  update(userId: string, input: UpdateUserProfileInput): Promise<void>;
}

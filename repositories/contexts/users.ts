/**
 * Users Bounded Context
 *
 * Groups user-related repositories: usersProfile, subscriptions, waitlist.
 * This context handles all user identity, profile, and subscription operations.
 */

import type { UsersProfileRepository } from '@/repositories/contracts/users-profile-repository';
import type { SubscriptionsRepository } from '@/repositories/contracts/subscriptions-repository';
import type { WaitlistRepository } from '@/repositories/contracts/waitlist-repository';

export interface UsersContext {
  usersProfile: UsersProfileRepository;
  subscriptions: SubscriptionsRepository;
  waitlist: WaitlistRepository;
}

export interface CreateUsersContextInput {
  usersProfile: UsersProfileRepository;
  subscriptions: SubscriptionsRepository;
  waitlist: WaitlistRepository;
}

/**
 * Factory function to create a Users bounded context.
 *
 * @param input - Repository instances for the users domain
 * @returns UsersContext with grouped repository access
 */
export function createUsersContext(input: CreateUsersContextInput): UsersContext {
  return {
    usersProfile: input.usersProfile,
    subscriptions: input.subscriptions,
    waitlist: input.waitlist,
  };
}

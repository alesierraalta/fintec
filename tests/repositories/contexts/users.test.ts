/**
 * Task 3.3: Users Bounded Context
 *
 * Tests for UsersContext interface and createUsersContext factory.
 * Groups: usersProfile, subscriptions, waitlist repositories.
 */

import type { UsersContext } from '@/repositories/contexts/users';

// ─── Task 3.3: UsersContext Interface Tests ───────────────────────────────────

describe('UsersContext interface', () => {
  it('should export UsersContext type from the context file', async () => {
    const mod = await import('@/repositories/contexts/users');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('should have createUsersContext factory function', async () => {
    const mod = await import('@/repositories/contexts/users');
    expect(typeof mod.createUsersContext).toBe('function');
  });
});

// ─── Task 3.3: UsersContext Implementation Tests ──────────────────────────────

describe('createUsersContext', () => {
  let createUsersContext: typeof import('@/repositories/contexts/users').createUsersContext;

  beforeAll(async () => {
    const mod = await import('@/repositories/contexts/users');
    createUsersContext = mod.createUsersContext;
  });

  const mockUsersProfileRepo = {
    upsert: jest.fn(),
    update: jest.fn(),
  };

  const mockSubscriptionsRepo = {
    getUserSubscriptionSnapshot: jest.fn(),
  };

  const mockWaitlistRepo = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a users context with all required repositories', () => {
    const context = createUsersContext({
      usersProfile: mockUsersProfileRepo as never,
      subscriptions: mockSubscriptionsRepo as never,
      waitlist: mockWaitlistRepo as never,
    });

    expect(context).toBeDefined();
    expect(context.usersProfile).toBe(mockUsersProfileRepo);
    expect(context.subscriptions).toBe(mockSubscriptionsRepo);
    expect(context.waitlist).toBe(mockWaitlistRepo);
  });

  it('should expose users profile repository with correct interface', () => {
    const context = createUsersContext({
      usersProfile: mockUsersProfileRepo as never,
      subscriptions: mockSubscriptionsRepo as never,
      waitlist: mockWaitlistRepo as never,
    });

    expect(typeof context.usersProfile.upsert).toBe('function');
    expect(typeof context.usersProfile.update).toBe('function');
  });

  it('should expose subscriptions repository with correct interface', () => {
    const context = createUsersContext({
      usersProfile: mockUsersProfileRepo as never,
      subscriptions: mockSubscriptionsRepo as never,
      waitlist: mockWaitlistRepo as never,
    });

    expect(typeof context.subscriptions.getUserSubscriptionSnapshot).toBe('function');
  });

  it('should expose waitlist repository with correct interface', () => {
    const context = createUsersContext({
      usersProfile: mockUsersProfileRepo as never,
      subscriptions: mockSubscriptionsRepo as never,
      waitlist: mockWaitlistRepo as never,
    });

    expect(typeof context.waitlist.create).toBe('function');
  });
});

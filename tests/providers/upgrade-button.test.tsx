import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { UpgradeButton } from '@/components/subscription/upgrade-button';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function stubFetch(tier: 'free' | 'premium') {
  const deferred = createDeferred<{ ok: boolean; json: () => Promise<any> }>();
  const fetchMock = jest.fn().mockReturnValue(deferred.promise);
  global.fetch = fetchMock as any;

  const resolveWithTier = () =>
    deferred.resolve({
      ok: true,
      json: async () => ({
        subscription: null,
        tier,
        usage: null,
        usageStatus: null,
        limits: {},
      }),
    });

  return { fetchMock, resolveWithTier };
}

describe('UpgradeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never renders for a premium user, before or after the fetch resolves', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-premium', email: 'premium@test.com' },
      session: { access_token: 'token-123' },
    });
    const { resolveWithTier } = stubFetch('premium');

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithTier();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();
  });

  it('is hidden while loading and shows Spanish copy only once tier is confirmed free', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-free', email: 'free@test.com' },
      session: { access_token: 'token-123' },
    });
    const { resolveWithTier } = stubFetch('free');

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithTier();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Mejorar a Premium')).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();
  });
});

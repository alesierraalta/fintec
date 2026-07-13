import React, { useContext } from 'react';
import { render, screen, act } from '@testing-library/react';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import {
  SubscriptionProvider,
  SubscriptionContext,
} from '@/providers/subscription-provider';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Probe({ label, log }: { label: string; log: string[] }) {
  const ctx = useContext(SubscriptionContext);
  log.push(`${label}:${ctx?.loading}:${ctx?.tier}`);
  return (
    <div data-testid={`probe-${label}`}>
      {ctx?.loading ? 'loading' : ctx?.tier}
    </div>
  );
}

describe('SubscriptionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@test.com' },
      session: { access_token: 'token-123' },
    });
  });

  it('performs exactly one fetch for N mounted consumers and never exposes an intermediate free tier before premium resolves', async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<any>;
    }>();
    const fetchMock = jest.fn().mockReturnValue(deferred.promise);
    global.fetch = fetchMock as any;

    const log: string[] = [];

    render(
      <SubscriptionProvider>
        <Probe label="sidebar" log={log} />
        <Probe label="upgrade-button" log={log} />
        <Probe label="premium-status-card" log={log} />
      </SubscriptionProvider>
    );

    // All three consumers should start in loading state, sourced from ONE provider.
    expect(screen.getByTestId('probe-sidebar')).toHaveTextContent('loading');
    expect(screen.getByTestId('probe-upgrade-button')).toHaveTextContent(
      'loading'
    );
    expect(screen.getByTestId('probe-premium-status-card')).toHaveTextContent(
      'loading'
    );

    await act(async () => {
      deferred.resolve({
        ok: true,
        json: async () => ({
          subscription: null,
          tier: 'premium',
          usage: null,
          usageStatus: null,
          limits: {},
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('probe-sidebar')).toHaveTextContent('premium');
    expect(screen.getByTestId('probe-upgrade-button')).toHaveTextContent(
      'premium'
    );
    expect(screen.getByTestId('probe-premium-status-card')).toHaveTextContent(
      'premium'
    );

    // Single shared fetch cycle across all mounted consumers.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // No consumer should ever have observed a resolved "free" tier before
    // premium landed — that transient state is what caused the button flash.
    const flashedFree = log.some((entry) => entry.endsWith(':false:free'));
    expect(flashedFree).toBe(false);
  });
});

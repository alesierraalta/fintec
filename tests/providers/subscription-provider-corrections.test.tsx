import React, { useContext, useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';

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

function jsonResponse(body: any, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function makePayload(tier: 'free' | 'base' | 'premium') {
  return {
    subscription: tier === 'free' ? null : ({ id: 'sub-1', tier } as any),
    tier,
    usage: null,
    usageStatus: null,
    limits: {},
  };
}

function Probe({ log }: { log: string[] }) {
  const ctx = useContext(SubscriptionContext);
  log.push(`${ctx?.loading}:${ctx?.tier}:${ctx?.error ?? 'null'}`);
  return (
    <div data-testid="probe">
      {ctx?.loading ? 'loading' : ctx?.tier}
      {ctx?.error ? `:${ctx.error}` : ''}
    </div>
  );
}

/** Test-only harness that lets us call `ctx.hydrate` on demand, mirroring how
 * a later-mounted consumer (e.g. /pricing) would seed shared state. */
function HydrateTrigger({ armed, payload }: { armed: boolean; payload: any }) {
  const ctx = useContext(SubscriptionContext);
  useEffect(() => {
    if (armed) {
      ctx?.hydrate(payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);
  return null;
}

describe('SubscriptionProvider — bounded correction transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // FIX 1 -----------------------------------------------------------------
  it('FIX1: does not suppress a refetch triggered by a token refresh after a prior hydrate', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });

    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix1', email: 'fix1@test.com' },
      session: { access_token: 'token-initial' },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePayload('free')))
      .mockResolvedValueOnce(jsonResponse(makePayload('premium')));
    global.fetch = fetchMock as any;

    const log: string[] = [];

    const { rerender } = render(
      <SubscriptionProvider>
        <Probe log={log} />
        <HydrateTrigger armed={false} payload={makePayload('premium')} />
      </SubscriptionProvider>
    );

    // Flush the initial mount fetch.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A later-mounted consumer hydrates shared state from an SSR payload.
    rerender(
      <SubscriptionProvider>
        <Probe log={log} />
        <HydrateTrigger armed={true} payload={makePayload('premium')} />
      </SubscriptionProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });

    // Let the hydrate's cache entry age past the 30s TTL, then simulate a
    // Supabase TOKEN_REFRESHED event (new access_token -> new fetchSubscription
    // identity -> the mount effect legitimately needs to run again).
    await act(async () => {
      jest.advanceTimersByTime(30_001);
    });

    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix1', email: 'fix1@test.com' },
      session: { access_token: 'token-refreshed' },
    });
    rerender(
      <SubscriptionProvider>
        <Probe log={log} />
        <HydrateTrigger armed={true} payload={makePayload('premium')} />
      </SubscriptionProvider>
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The token-refresh-driven refetch must NOT be swallowed by a stale
    // "skip next fetch" flag armed by the earlier hydrate.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // FIX 2 -----------------------------------------------------------------
  it('FIX2: does not let a late-resolving fetch for a previous user overwrite the current user state', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-a', email: 'a@test.com' },
      session: { access_token: 'token-a' },
    });

    const deferredA = createDeferred<any>();
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => deferredA.promise)
      .mockImplementationOnce(() =>
        Promise.resolve(jsonResponse(makePayload('free')))
      );
    global.fetch = fetchMock as any;

    const log: string[] = [];

    const { rerender } = render(
      <SubscriptionProvider>
        <Probe log={log} />
      </SubscriptionProvider>
    );

    // Fetch for user A kicked off, still pending.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // User B logs in before A's request resolves.
    mockUseAuth.mockReturnValue({
      user: { id: 'user-b', email: 'b@test.com' },
      session: { access_token: 'token-b' },
    });
    rerender(
      <SubscriptionProvider>
        <Probe log={log} />
      </SubscriptionProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('probe')).toHaveTextContent('free');

    // A's stale premium response finally arrives.
    await act(async () => {
      deferredA.resolve(jsonResponse(makePayload('premium')));
      await Promise.resolve();
      await Promise.resolve();
    });

    // B's tier must remain "free" — A's response must be discarded.
    expect(screen.getByTestId('probe')).toHaveTextContent('free');
  });

  // FIX 3 -----------------------------------------------------------------
  it('FIX3: times out a hanging request so loading eventually clears and a later retry can fetch again', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });

    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix3', email: 'fix3@test.com' },
      session: { access_token: 'token-1' },
    });

    const hangingPromise = new Promise(() => {
      /* never resolves or rejects */
    });
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => hangingPromise)
      .mockImplementationOnce(() =>
        Promise.resolve(jsonResponse(makePayload('free')))
      );
    global.fetch = fetchMock as any;

    const log: string[] = [];
    render(
      <SubscriptionProvider>
        <Probe log={log} />
      </SubscriptionProvider>
    );

    expect(screen.getByTestId('probe')).toHaveTextContent('loading');

    // Advance past the internal request timeout.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_001);
    });

    expect(screen.getByTestId('probe')).not.toHaveTextContent('loading');
    const lastEntry = log[log.length - 1];
    expect(lastEntry.endsWith('null')).toBe(false); // error must be set

    // The stuck in-flight entry must have been cleared so a retry can fetch again.
    render(
      <SubscriptionProvider>
        <Probe log={log} />
      </SubscriptionProvider>
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // FIX 4 -----------------------------------------------------------------
  it('FIX4a: fails closed to free tier on a 401 auth rejection even if premium was previously shown', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix4a', email: 'fix4a@test.com' },
      session: { access_token: 'token-1' },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePayload('premium')))
      .mockResolvedValueOnce(
        jsonResponse({ error: 'unauthorized' }, false, 401)
      );
    global.fetch = fetchMock as any;

    let ctxRef: any = null;
    function Capture() {
      ctxRef = useContext(SubscriptionContext);
      return null;
    }

    render(
      <SubscriptionProvider>
        <Capture />
      </SubscriptionProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(ctxRef.tier).toBe('premium');

    await act(async () => {
      await ctxRef.refresh();
    });

    expect(ctxRef.tier).toBe('free');
    expect(ctxRef.subscription).toBeNull();
  });

  it('FIX4b: keeps the last-known tier on a transient network/server error (no flash to free)', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix4b', email: 'fix4b@test.com' },
      session: { access_token: 'token-1' },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(makePayload('premium')))
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, false, 500));
    global.fetch = fetchMock as any;

    let ctxRef: any = null;
    function Capture() {
      ctxRef = useContext(SubscriptionContext);
      return null;
    }

    render(
      <SubscriptionProvider>
        <Capture />
      </SubscriptionProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(ctxRef.tier).toBe('premium');

    await act(async () => {
      await ctxRef.refresh();
    });

    expect(ctxRef.tier).toBe('premium');
    expect(ctxRef.error).toBeTruthy();
  });

  // FIX 6 -----------------------------------------------------------------
  it('FIX6: window focus respects the 30s cache TTL (no fetch storm), while refresh() bypasses it', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-fix6', email: 'fix6@test.com' },
      session: { access_token: 'token-1' },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(makePayload('premium')));
    global.fetch = fetchMock as any;

    let ctxRef: any = null;
    function Capture() {
      ctxRef = useContext(SubscriptionContext);
      return null;
    }

    render(
      <SubscriptionProvider>
        <Capture />
      </SubscriptionProvider>
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Rapid alt-tab/refocus within the cache TTL must NOT hit the API again.
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // An explicit refresh() forces a cache-bypassing reload.
    await act(async () => {
      await ctxRef.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

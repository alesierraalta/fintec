import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { UpgradeButton } from '@/components/subscription/upgrade-button';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// The provider keeps a module-level cache/in-flight map keyed by user id, so
// every test must use a DISTINCT user id to avoid cross-test cache pollution.
let authCounter = 0;
function authAs() {
  const id = `upgrade-btn-${authCounter++}`;
  mockUseAuth.mockReturnValue({
    user: { id, email: `${id}@test.com` },
    session: { access_token: 'token-123' },
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function stubFetch(payload: Record<string, unknown>, ok = true) {
  const deferred = createDeferred<{ ok: boolean; json: () => Promise<any> }>();
  const fetchMock = jest.fn().mockReturnValue(deferred.promise);
  global.fetch = fetchMock as any;

  const resolveWithPayload = () =>
    deferred.resolve({
      ok,
      json: async () => (ok ? payload : { error: 'boom' }),
    });

  return { fetchMock, resolveWithPayload };
}

const basePayload = (overrides: Record<string, unknown> = {}) => ({
  subscription: null,
  tier: 'free',
  isOwnerAdmin: false,
  usage: null,
  usageStatus: null,
  limits: {},
  ...overrides,
});

describe('UpgradeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never renders for a premium user, before or after the fetch resolves', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(basePayload({ tier: 'premium' }));

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();
  });

  it('is hidden while loading and shows Spanish copy only once tier is confirmed free', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(basePayload());

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Mejorar a Premium')).toBeInTheDocument();
    expect(screen.queryByText(/Upgrade to Premium/i)).not.toBeInTheDocument();
  });

  it('never renders for an owner/admin user even when the tier resolves to free (root cause regression)', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(
      basePayload({ tier: 'free', isOwnerAdmin: true })
    );

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Mejorar a Premium/i })
    ).not.toBeInTheDocument();
  });

  it('is hidden for a base (paid) user, before and after the fetch resolves', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(basePayload({ tier: 'base' }));

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
  });

  it('is hidden on an error/fallback state so eligibility is never assumed from the free default', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(basePayload(), false);

    render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText(/Mejorar a Premium/i)).not.toBeInTheDocument();
  });

  it('renders a restrained CTA free of rainbow classes, shimmer, glow, and premium glyph icons', async () => {
    authAs();
    const { resolveWithPayload } = stubFetch(basePayload());
    const { container } = render(
      <SubscriptionProvider>
        <UpgradeButton />
      </SubscriptionProvider>
    );

    await act(async () => {
      resolveWithPayload();
      await Promise.resolve();
      await Promise.resolve();
    });

    const cta = screen.getByRole('link', { name: /Mejorar a Premium/i });
    expect(cta).toHaveAttribute('href', '/pricing');
    expect(cta.className).toMatch(/bg-primary/);

    const html = container.innerHTML;
    // No animated/rainbow multi-gradient classes
    expect(html).not.toContain('animate-gradient');
    expect(html).not.toContain('from-purple-600');
    expect(html).not.toContain('via-primary');
    expect(html).not.toContain('to-purple-500');
    expect(html).not.toContain('[background-size:200%_200%]');
    expect(html).not.toContain('translate-x-[-200%]');
    // No Crown/Sparkles glyphs
    expect(html).not.toContain('lucide-crown');
    expect(html).not.toContain('lucide-sparkles');
  });
});

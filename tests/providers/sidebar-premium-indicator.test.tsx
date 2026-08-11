import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SubscriptionProvider } from '@/providers/subscription-provider';
import { Sidebar } from '@/components/layout/sidebar';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/contexts/sidebar-context', () => ({
  useSidebar: () => ({
    closeSidebar: jest.fn(),
    isMobile: false,
    isOpen: true,
  }),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// The provider keeps a module-level cache/in-flight map keyed by user id, so
// every test must use a DISTINCT user id to avoid cross-test cache pollution.
let authCounter = 0;
function authAs() {
  const id = `sidebar-${authCounter++}`;
  mockUseAuth.mockReturnValue({
    user: { id, email: `${id}@test.com` },
    session: { access_token: 'token-123' },
  });
}

describe('Sidebar premium indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authAs();
  });

  it('shows exactly one premium indicator and no duplicate "Plan {tier}" text', async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<any>;
    }>();
    global.fetch = jest.fn().mockReturnValue(deferred.promise) as any;

    render(
      <SubscriptionProvider>
        <Sidebar />
      </SubscriptionProvider>
    );

    await act(async () => {
      deferred.resolve({
        ok: true,
        json: async () => ({
          subscription: null,
          tier: 'premium',
          isOwnerAdmin: false,
          usage: null,
          usageStatus: null,
          limits: {},
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getAllByText('Premium Activo')).toHaveLength(1);
    expect(screen.queryByText(/Plan Premium/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Plan Gratis/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Plan Base/i)).not.toBeInTheDocument();
  });

  it('renders no upgrade CTA for an owner/admin whose tier resolves to free (root cause regression)', async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<any>;
    }>();
    global.fetch = jest.fn().mockReturnValue(deferred.promise) as any;

    render(
      <SubscriptionProvider>
        <Sidebar />
      </SubscriptionProvider>
    );

    await act(async () => {
      deferred.resolve({
        ok: true,
        json: async () => ({
          subscription: null,
          tier: 'free',
          isOwnerAdmin: true,
          usage: null,
          usageStatus: null,
          limits: {},
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Owner/admin must never see the upgrade CTA.
    expect(
      screen.queryByRole('link', { name: /Mejorar a Premium/i })
    ).not.toBeInTheDocument();
    // And no premium status card (the owner is not a paid premium user).
    expect(screen.queryByText(/Premium Activo/i)).not.toBeInTheDocument();
  });

  it('shows the upgrade CTA for a free non-owner user on the desktop render path', async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<any>;
    }>();
    global.fetch = jest.fn().mockReturnValue(deferred.promise) as any;

    render(
      <SubscriptionProvider>
        <Sidebar />
      </SubscriptionProvider>
    );

    await act(async () => {
      deferred.resolve({
        ok: true,
        json: async () => ({
          subscription: null,
          tier: 'free',
          isOwnerAdmin: false,
          usage: null,
          usageStatus: null,
          limits: {},
        }),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByRole('link', { name: /Mejorar a Premium/i })
    ).toHaveAttribute('href', '/pricing');
  });

  it('never flashes the upgrade CTA while eligibility is still loading', async () => {
    // Never resolves: the provider stays in the loading state forever,
    // which is the window where a hydration flash would be visible.
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as any;

    render(
      <SubscriptionProvider>
        <Sidebar />
      </SubscriptionProvider>
    );

    expect(
      screen.queryByRole('link', { name: /Mejorar a Premium/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Premium Activo/i)).not.toBeInTheDocument();
  });
});

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

describe('Sidebar premium indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-sidebar-premium', email: 'premium@test.com' },
      session: { access_token: 'token-123' },
    });
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
});

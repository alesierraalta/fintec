import React from 'react';
import { renderHook } from '@testing-library/react';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import { SubscriptionProvider } from '@/providers/subscription-provider';
import { useSubscription } from '@/hooks/use-subscription';

describe('useSubscription wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@test.com' },
      session: { access_token: 'token-123' },
    });
  });

  it('throws when used outside a SubscriptionProvider', () => {
    // Suppress the expected React error boundary console.error noise.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSubscription());
    }).toThrow(/useSubscription must be used within/i);

    spy.mockRestore();
  });

  it('hydrates immediately from initialPayload with no fetch call, avoiding a loading flash', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SubscriptionProvider>{children}</SubscriptionProvider>
    );

    const initialPayload = {
      subscription: null,
      tier: 'premium' as const,
      usage: null,
      usageStatus: null,
      limits: {} as any,
    };

    const { result } = renderHook(() => useSubscription(initialPayload), {
      wrapper,
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.tier).toBe('premium');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

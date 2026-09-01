import { render, cleanup } from '@testing-library/react';
import { FinancialRealtimeSync } from '@/components/providers/financial-realtime-sync';
import { getClientDBProvider } from '@/repositories/factory';
import { supabase } from '@/repositories/supabase/client';

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}));
jest.mock('@/providers', () => ({ useRepository: () => ({}) }));
jest.mock('@/repositories/factory', () => ({ getClientDBProvider: jest.fn() }));
jest.mock('@/lib/finance/financial-data-sync', () => ({
  scheduleFinancialRealtimeRefresh: jest.fn(),
  cancelFinancialRealtimeRefresh: jest.fn(),
}));
jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('FinancialRealtimeSync', () => {
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  };

  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();
    (getClientDBProvider as jest.Mock).mockReturnValue('supabase');
    (supabase.channel as jest.Mock).mockReturnValue(channel);
  });

  it('creates one user channel and removes it on cleanup', () => {
    render(<FinancialRealtimeSync />).unmount();

    expect(supabase.channel).toHaveBeenCalledWith(
      expect.stringMatching(/^financial-data:user-a:/)
    );
    expect(channel.on).toHaveBeenCalledTimes(3);
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('does not create a channel for the local provider', () => {
    (getClientDBProvider as jest.Mock).mockReturnValue('local');
    render(<FinancialRealtimeSync />);

    expect(supabase.channel).not.toHaveBeenCalled();
  });
});

import { renderHook, act } from '@testing-library/react';
import { useRecurringCreation } from '@/hooks/use-recurring-creation';
import { supabase } from '@/repositories/supabase/client';

jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useRecurringCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
    });
    (global.fetch as any) = jest.fn();
  });

  const baseData = {
    name: 'Rent',
    type: 'EXPENSE' as const,
    accountId: 'acc-1',
    currencyCode: 'USD',
    amountMinor: 120000,
    frequency: 'monthly' as const,
    startDate: '2026-06-01',
  };

  it('POSTs the rule with registerFirstOperation and returns rule-created', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        outcome: 'rule-created',
        data: { id: 'rec-1' },
      }),
    });

    const { result } = renderHook(() => useRecurringCreation());
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createRecurring(baseData, false);
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/recurring-transactions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(
      expect.objectContaining({ registerFirstOperation: false, name: 'Rent' })
    );
    expect(outcome).toEqual({
      status: 'rule-created',
      transaction: { id: 'rec-1' },
    });
  });

  it('returns partial-failure without throwing when the first operation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        success: false,
        outcome: 'partial-failure',
        data: { id: 'rec-1' },
        error: 'No se pudo registrar la primera operación...',
      }),
    });

    const { result } = renderHook(() => useRecurringCreation());
    let outcome: any;
    await act(async () => {
      outcome = await result.current.createRecurring(baseData, true);
    });

    expect(outcome).toEqual({
      status: 'partial-failure',
      transaction: { id: 'rec-1' },
      error: 'No se pudo registrar la primera operación...',
    });
  });

  it('shows a Spanish error and throws when the rule persists but the request fails to parse', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'No se pudo guardar la regla recurrente. Revisa tu conexión.',
      }),
    });

    const { result } = renderHook(() => useRecurringCreation());
    let error: any;
    await act(async () => {
      try {
        await result.current.createRecurring(baseData, false);
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('No se pudo guardar la regla');
  });
});

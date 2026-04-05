import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecurringPage from '@/app/recurring/recurring-page-client';
import { useAppStore } from '@/lib/store';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'token-1' } },
      }),
    },
  },
}));

jest.mock('@/lib/store', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('@/hooks/use-bcv-rates', () => ({
  useBCVRates: jest.fn(),
}));

jest.mock('@/hooks/use-binance-rates', () => ({
  useBinanceRates: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const recurringTransactionFixture = {
  id: 'rec-1',
  userId: 'user-1',
  name: 'Arriendo',
  type: 'EXPENSE',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  currencyCode: 'USD',
  amountMinor: 120000,
  description: 'Pago de arriendo',
  note: 'Banco',
  tags: ['hogar'],
  frequency: 'monthly',
  intervalCount: 1,
  startDate: '2026-01-01',
  endDate: undefined,
  nextExecutionDate: '2026-03-01',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const summaryFixture = {
  totalActive: 1,
  totalInactive: 0,
  nextExecutions: { today: 0, thisWeek: 1, thisMonth: 1 },
  byFrequency: { daily: 0, weekly: 0, monthly: 1, yearly: 0 },
};

function createRecurringGetResponse() {
  return {
    success: true,
    data: {
      transactions: [recurringTransactionFixture],
      summary: summaryFixture,
    },
  };
}

function mockFetchJsonOnce(body: any, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: jest.fn().mockResolvedValue(body),
  } as any);
}

describe('RecurringPage edit/delete flows', () => {
  beforeAll(() => {
    if (!global.requestAnimationFrame) {
      global.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(cb, 0)) as any;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any) = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedUseAppStore = useAppStore as any;
    mockedUseAppStore.mockImplementation((selector: any) =>
      selector({ selectedRateSource: 'bcv_usd' })
    );
    (useBCVRates as jest.Mock).mockReturnValue({ usd: 36.5, eur: 40 });
    (useBinanceRates as jest.Mock).mockReturnValue({
      rates: { usdt_ves: 36.4 },
    });
  });

  it('opens edit dialog and validates before submit', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());

    render(<RecurringPage />);

    expect(await screen.findByText('Arriendo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Acciones para Arriendo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Editar transaccion recurrente',
      })
    ).toBeInTheDocument();

    const nameInput = screen.getByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('El nombre es requerido')
    ).toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('submits edit and refreshes canonical recurring data', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());
    mockFetchJsonOnce({ success: true, data: recurringTransactionFixture });
    mockFetchJsonOnce(createRecurringGetResponse());

    render(<RecurringPage />);

    expect(await screen.findByText('Arriendo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Acciones para Arriendo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));

    const nameInput = await screen.findByLabelText('Nombre');
    fireEvent.change(nameInput, { target: { value: 'Arriendo actualizado' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[1][0]).toBe('/api/recurring-transactions');
    expect(calls[1][1].method).toBe('PUT');
    expect(JSON.parse(calls[1][1].body)).toEqual(
      expect.objectContaining({
        id: 'rec-1',
        name: 'Arriendo actualizado',
      })
    );
    expect(calls[2][0]).toBe('/api/recurring-transactions');
    expect(calls[2][1].method).toBeUndefined();
  });

  it('confirms and executes delete then refreshes list', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());
    mockFetchJsonOnce({ success: true, message: 'deleted' });
    mockFetchJsonOnce(createRecurringGetResponse());

    render(<RecurringPage />);

    expect(await screen.findByText('Arriendo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Acciones para Arriendo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Eliminar transaccion recurrente',
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[1][0]).toBe('/api/recurring-transactions?id=rec-1');
    expect(calls[1][1].method).toBe('DELETE');
    expect(calls[2][0]).toBe('/api/recurring-transactions');
  });

  it('cancels delete without triggering delete request', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());

    render(<RecurringPage />);

    expect(await screen.findByText('Arriendo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Acciones para Arriendo'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Eliminar transaccion recurrente',
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: 'Eliminar transaccion recurrente',
        })
      ).not.toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

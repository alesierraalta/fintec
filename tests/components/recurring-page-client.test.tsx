import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecurringPage from '@/app/recurring/recurring-page-client';
import { useAppStore } from '@/lib/store';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers';
import { useRecurringCreation } from '@/hooks/use-recurring-creation';
import { toast } from 'sonner';

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

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/providers', () => ({
  useRepository: jest.fn(),
}));

jest.mock('@/hooks/use-recurring-creation', () => ({
  useRecurringCreation: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

const mockCreateRecurring = jest.fn();

const activeAccountFixture = {
  id: 'acc-1',
  name: 'Cuenta Principal',
  type: 'BANK',
  currencyCode: 'USD',
  balance: 500000,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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
    mockCreateRecurring.mockReset();
    mockCreateRecurring.mockResolvedValue({
      status: 'rule-created',
      transaction: recurringTransactionFixture,
    });
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
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useRepository as jest.Mock).mockReturnValue({
      accounts: {
        findByUserId: jest.fn().mockResolvedValue([activeAccountFixture]),
      },
    });
    mockCreateRecurring.mockResolvedValue({
      status: 'rule-created',
      transaction: recurringTransactionFixture,
    });
    (useRecurringCreation as jest.Mock).mockReturnValue({
      createRecurring: mockCreateRecurring,
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

  it('opens the create-rule dialog when clicking Nueva Recurrente', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());
    render(<RecurringPage />);

    expect(await screen.findByText('Arriendo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nueva Recurrente/i }));

    expect(
      await screen.findByRole('heading', {
        name: 'Nueva transaccion recurrente',
      })
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the create-rule dialog when clicking Crear Primera Recurrente on empty state', async () => {
    mockFetchJsonOnce({
      success: true,
      data: {
        transactions: [],
        summary: {
          totalActive: 0,
          totalInactive: 0,
          nextExecutions: { today: 0, thisWeek: 0, thisMonth: 0 },
          byFrequency: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
        },
      },
    });

    render(<RecurringPage />);

    const createFirstBtn = await screen.findByRole('button', {
      name: /Crear Primera Recurrente/i,
    });
    fireEvent.click(createFirstBtn);

    expect(
      await screen.findByRole('heading', {
        name: 'Nueva transaccion recurrente',
      })
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

  describe('RecurringPage create flow (rule-first via useRecurringCreation)', () => {
  beforeAll(() => {
    if (!global.requestAnimationFrame) {
      global.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(cb, 0)) as any;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRecurring.mockReset();
    mockCreateRecurring.mockResolvedValue({
      status: 'rule-created',
      transaction: recurringTransactionFixture,
    });
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
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
    (useRepository as jest.Mock).mockReturnValue({
      accounts: {
        findByUserId: jest.fn().mockResolvedValue([activeAccountFixture]),
      },
    });
    (useRecurringCreation as jest.Mock).mockReturnValue({
      createRecurring: mockCreateRecurring,
    });
  });

  async function openCreateDialog() {
    mockFetchJsonOnce(createRecurringGetResponse());
    render(<RecurringPage />);
    expect(await screen.findByText('Arriendo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Nueva Recurrente/i }));
    expect(
      await screen.findByRole('heading', {
        name: 'Nueva transaccion recurrente',
      })
    ).toBeInTheDocument();
  }

  async function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Arriendo' },
    });
    fireEvent.change(screen.getByLabelText('Monto'), {
      target: { value: '1200' },
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Cuenta')).not.toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText('Cuenta'), {
      target: { value: 'acc-1' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), {
      target: { value: '2026-03-01' },
    });
  }

  it('registers the first operation when explicitly chosen and refreshes the list', async () => {
    mockCreateRecurring.mockResolvedValueOnce({
      status: 'first-operation-created',
      transaction: recurringTransactionFixture,
      transactionId: 'tx-1',
    });
    mockFetchJsonOnce(createRecurringGetResponse());
    await openCreateDialog();

    await fillRequiredFields();
    fireEvent.click(
      screen.getByLabelText('Registrar la primera operacion ahora')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crear regla recurrente' }));

    await waitFor(() =>
      expect(mockCreateRecurring).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Arriendo',
          type: 'EXPENSE',
          accountId: 'acc-1',
          currencyCode: 'USD',
          amountMinor: 120000,
          frequency: 'monthly',
          startDate: '2026-03-01',
        }),
        true
      )
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Regla recurrente y primera operación creadas'
      )
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('persists the rule without a first operation when the choice is declined', async () => {
    mockFetchJsonOnce(createRecurringGetResponse());
    await openCreateDialog();

    await fillRequiredFields();
    // The checkbox is left UNCHECKED: the explicit choice is "no operation now".
    fireEvent.click(screen.getByRole('button', { name: 'Crear regla recurrente' }));

    await waitFor(() =>
      expect(mockCreateRecurring).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Arriendo' }),
        false
      )
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Regla recurrente guardada correctamente'
      )
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('shows the Spanish corrective error and retains the rule on partial-failure', async () => {
    mockCreateRecurring.mockResolvedValueOnce({
      status: 'partial-failure',
      transaction: recurringTransactionFixture,
      error:
        'No se pudo registrar la primera operación, aunque la regla recurrente quedó guardada. Reintenta registrar la operación o edítala desde la página de recurrencias.',
    });
    await openCreateDialog();

    await fillRequiredFields();
    fireEvent.click(
      screen.getByLabelText('Registrar la primera operacion ahora')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Crear regla recurrente' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo registrar la primera operación, aunque la regla recurrente quedó guardada. Reintenta registrar la operación o edítala desde la página de recurrencias.'
      )
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', {
          name: 'Nueva transaccion recurrente',
        })
      ).not.toBeInTheDocument()
    );
  });

  it('keeps the dialog open and shows the Spanish error when the rule cannot be persisted', async () => {
    mockCreateRecurring.mockRejectedValueOnce(
      new Error(
        'No se pudo guardar la regla recurrente. Revisa tu conexión o intenta de nuevo.'
      )
    );
    await openCreateDialog();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Crear regla recurrente' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo guardar la regla recurrente. Revisa tu conexión o intenta de nuevo.'
      )
    );
    expect(
      screen.getByRole('heading', {
        name: 'Nueva transaccion recurrente',
      })
    ).toBeInTheDocument();
  });
});

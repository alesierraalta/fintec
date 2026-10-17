import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReconcileBalanceModal } from '@/components/bulk-capture/reconcile-balance-modal';
import { QuickEntryModal } from '@/components/bulk-capture/quick-entry-modal';
import { StatementImportModal } from '@/components/bulk-capture/statement-import-modal';
import { saveTransactions } from '@/components/bulk-capture/save-transactions';
import {
  TransactionType,
  type Account,
  type Transaction,
} from '@/types/domain';
import { toast } from 'sonner';

const mockCreate = jest.fn();
const mockRepository = { transactions: { create: mockCreate } };
jest.mock('@/providers', () => ({ useRepository: () => mockRepository }));
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user' } }),
}));
jest.mock('@/lib/rates', () => ({ useActiveUsdVesRate: () => 100 }));
jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: ({ mutation }: { mutation: () => Promise<unknown> }) =>
    mutation(),
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock('@/components/ui', () => ({
  Modal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

const account = {
  id: 'account',
  name: 'Efectivo',
  currencyCode: 'USD',
  balance: 10000,
} as Account;
const base = {
  isOpen: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
  accounts: [account],
  categories: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockReset().mockResolvedValue({});
});

it('reconciles a lower balance with one normal expense that counts in statistics', async () => {
  render(<ReconcileBalanceModal {...base} account={account} />);
  fireEvent.change(screen.getByLabelText('Saldo real hoy'), {
    target: { value: '80' },
  });
  expect(
    screen.getByText('Se registrará un gasto de $20,00')
  ).toBeInTheDocument();
  expect(screen.getByText('Saldo registrado: $100,00')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirmar conciliación' })
  );
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'EXPENSE',
      amountMinor: 2000,
      tags: ['conciliacion'],
      accountId: account.id,
    })
  );
});

it('does not create an adjustment when the balance already matches', () => {
  render(<ReconcileBalanceModal {...base} account={account} />);
  fireEvent.change(screen.getByLabelText('Saldo real hoy'), {
    target: { value: '100' },
  });
  expect(screen.getByText('Tu saldo ya cuadra')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Confirmar conciliación' })
  ).toBeDisabled();
  expect(mockCreate).not.toHaveBeenCalled();
});

it('saves each quick expense with its parsed amount and quick-entry tag', async () => {
  render(<QuickEntryModal {...base} />);
  fireEvent.change(screen.getByLabelText('Gastos'), {
    target: { value: 'café 2, taxi 5' },
  });
  fireEvent.change(screen.getByLabelText('Cuenta'), {
    target: { value: account.id },
  });
  expect(screen.getByText('Total: $7,00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar 2 gastos' }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
  expect(
    mockCreate.mock.calls.map(([dto]) => [
      dto.description,
      dto.amountMinor,
      dto.type,
      dto.tags,
    ])
  ).toEqual([
    ['café', 200, 'EXPENSE', ['registro-rapido']],
    ['taxi', 500, 'EXPENSE', ['registro-rapido']],
  ]);
});

it('leaves history duplicates unchecked and imports only checked statement rows', async () => {
  const history = [
    {
      id: 'old',
      accountId: account.id,
      currencyCode: 'USD',
      amountMinor: 200,
      date: '2026-06-01',
    },
  ] as Transaction[];
  render(<StatementImportModal {...base} existingTransactions={history} />);
  const file = new File([''], 'extracto.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', {
    value: async () =>
      'fecha,descripcion,monto,referencia\n2026-06-01,café,-2,\n2026-06-02,taxi,-5,TX1234',
  });
  fireEvent.change(screen.getByLabelText('Archivo CSV'), {
    target: { files: [file] },
  });
  await screen.findByText('café');
  fireEvent.change(screen.getByLabelText('Cuenta'), {
    target: { value: account.id },
  });
  expect(screen.getByLabelText('Importar fila 2')).not.toBeChecked();
  expect(screen.getByLabelText('Importar fila 3')).toBeChecked();
  fireEvent.click(
    screen.getByRole('button', { name: 'Importar 1 movimientos' })
  );
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      description: 'taxi',
      amountMinor: 500,
      tags: ['extracto'],
      note: 'Ref: TX1234',
    })
  );
});

it('refuses VES without a rate and stops a partially failing batch without attempting later rows', async () => {
  const dto = {
    type: TransactionType.EXPENSE,
    accountId: account.id,
    currencyCode: 'VES',
    amountMinor: 100,
    date: '2026-06-01',
    description: 'café',
  };
  const options = {
    userId: 'user',
    repository: mockRepository as Parameters<
      typeof saveTransactions
    >[0]['repository'],
    transactions: [dto],
    exchangeRate: 0,
  };
  expect(await saveTransactions(options)).toEqual({
    saved: 0,
    complete: false,
  });
  expect(mockCreate).not.toHaveBeenCalled();
  mockCreate
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('offline'));
  expect(
    await saveTransactions({
      ...options,
      exchangeRate: 100,
      transactions: [dto, dto, dto],
    })
  ).toEqual({ saved: 1, complete: false });
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ exchangeRate: 100 })
  );
  expect(toast.error).toHaveBeenLastCalledWith(
    'Se guardaron 1 de 3 transacciones. No se guardaron las restantes.'
  );
});

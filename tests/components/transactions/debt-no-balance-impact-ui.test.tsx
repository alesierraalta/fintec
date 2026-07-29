import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types/domain';
import { MobileAddTransaction } from '@/components/transactions/mobile-add-transaction';
import { DesktopAddTransaction } from '@/components/transactions/desktop-add-transaction';

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
    isAuthenticated: true,
  }),
}));

jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({
    tier: 'pro',
    status: 'active',
  }),
  useUpgrade: () => ({
    upgrade: jest.fn(),
    loading: false,
  }),
}));

const mockAccountsList = [
  {
    id: 'acc-1',
    name: 'Cuenta Principal',
    currencyCode: 'USD',
    balance: 1000,
    active: true,
    createdAt: '',
    updatedAt: '',
    type: 'BANK' as any,
  },
  {
    id: 'acc-2',
    name: 'Cuenta Secundaria',
    currencyCode: 'USD',
    balance: 500,
    active: true,
    createdAt: '',
    updatedAt: '',
    type: 'BANK' as any,
  },
];

jest.mock('@/providers/repository-provider', () => ({
  useRepository: () => ({
    accounts: {
      list: jest.fn().mockResolvedValue(mockAccountsList),
      findByUserId: jest.fn().mockResolvedValue(mockAccountsList),
    },
    categories: {
      list: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue([]),
    },
  }),
}));

describe('Debt No-Balance-Impact UI Notice', () => {
  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Cuenta Principal',
      currencyCode: 'USD',
      balance: 1000,
      active: true,
      createdAt: '',
      updatedAt: '',
      type: 'BANK' as any,
    },
    {
      id: 'acc-2',
      name: 'Cuenta Secundaria',
      currencyCode: 'USD',
      balance: 500,
      active: true,
      createdAt: '',
      updatedAt: '',
      type: 'BANK' as any,
    },
  ];

  it('displays "Sin impacto en saldo" notice in TransactionForm when isDebt is enabled', async () => {
    render(
      <TransactionForm
        isOpen={true}
        type={TransactionType.EXPENSE}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        accounts={mockAccountsList}
        categories={[]}
      />
    );

    const isDebtCheckbox = await screen.findByRole('checkbox', {
      name: /es deuda/i,
    });
    fireEvent.click(isDebtCheckbox);

    await waitFor(() => {
      expect(
        screen.getAllByText(/sin impacto en saldo/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(
          /esta deuda registrará el compromiso sin sumar ni restar dinero a tu saldo/i
        )
      ).toBeInTheDocument();
    });
  });

  it('displays linked account notice when deductFromAccount is checked', async () => {
    render(
      <TransactionForm
        isOpen={true}
        transaction={
          {
            accountId: 'acc-1',
            type: TransactionType.EXPENSE,
            amountMinor: 1000,
            currencyCode: 'USD',
          } as any
        }
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        accounts={mockAccountsList}
        categories={[]}
      />
    );

    const isDebtCheckbox = await screen.findByRole('checkbox', {
      name: /es deuda/i,
    });
    fireEvent.click(isDebtCheckbox);

    await waitFor(() => {
      expect(
        screen.getByText(
          /afectará la cuenta de origen seleccionada mediante un movimiento vinculado/i
        )
      ).toBeInTheDocument();
    });
  });
});

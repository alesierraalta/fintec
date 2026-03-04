import React from 'react';
import { render, screen } from '@testing-library/react';
import { BalanceAlertSettings } from '@/components/forms/balance-alert-settings';
import { TransactionDetailPanel } from '@/components/transactions/transaction-detail-panel';
import { AccountType, TransactionType } from '@/types/domain';

const mockUpdateAccount = jest.fn();

jest.mock('@/providers/repository-provider', () => ({
  useRepository: () => ({
    accounts: {
      update: mockUpdateAccount,
    },
  }),
}));

describe('Mobile modal footer safe-area spacing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies explicit safe-area bottom padding in transaction mobile footer', () => {
    render(
      <TransactionDetailPanel
        transaction={{
          id: 'txn-1',
          type: TransactionType.EXPENSE,
          accountId: 'acc-1',
          categoryId: 'cat-1',
          currencyCode: 'USD',
          amountMinor: 1250,
          amountBaseMinor: 1250,
          exchangeRate: 1,
          date: '2026-03-03',
          description: 'Test transaction',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
        }}
        isOpen={true}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        isMobile={true}
        accountName="Cuenta Principal"
        categoryName="Comida"
        formatAmount={(minor) => (minor / 100).toFixed(2)}
        getCurrencySymbol={() => '$'}
      />
    );

    screen.getByRole('button', { name: /editar/i });

    const footer = Array.from(document.querySelectorAll('div')).find((el) =>
      el.className.includes('pb-[calc(1.5rem+env(safe-area-inset-bottom))]')
    );

    expect(footer).toBeTruthy();
  });

  it('applies safe-area-aware bottom padding in balance alert footer actions', () => {
    render(
      <BalanceAlertSettings
        isOpen={true}
        onClose={jest.fn()}
        account={{
          id: 'acc-1',
          userId: 'user-1',
          name: 'Cuenta Principal',
          type: AccountType.BANK,
          currencyCode: 'USD',
          balance: 250000,
          active: true,
          alertEnabled: true,
          minimumBalance: 10000,
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
        }}
      />
    );

    screen.getByRole('button', { name: /guardar/i });

    const footer = Array.from(document.querySelectorAll('div')).find(
      (el) =>
        el.className.includes(
          'pb-[calc(1.5rem+env(safe-area-inset-bottom))]'
        ) && el.className.includes('sm:pb-6')
    );

    expect(footer).toBeTruthy();
  });
});

/**
 * Prefill behavior of TransactionForm (test-plan-pending-items · f-06).
 *
 * The pending-items conversion flow opens the form with `prefill` so the
 * user does not re-type the name and amount of a checklist item. The mount
 * effect that resets form data must not wipe what the useState initializer
 * already consumed.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types';

// Mock heavy dependencies so the component only renders its UI.
// IMPORTANT: mocks must return STABLE references; otherwise the form's
// useEffect on `[isOpen, user, repository]` will re-run on every render
// and trip React's "Maximum update depth" guard.
jest.mock('@/providers', () => {
  const repo = {
    accounts: { findByUserId: jest.fn().mockResolvedValue([]) },
    categories: { findAll: jest.fn().mockResolvedValue([]) },
    transactions: {
      create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      update: jest.fn(),
    },
  };
  return {
    useRepository: () => repo,
    __repo: repo,
  };
});

const authState = { user: { id: 'user-1' } };
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const subState = {
  usageStatus: { transactions: { used: 0, limit: 100 } },
  isAtLimit: () => false,
  tier: 'free',
};
jest.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => subState,
}));

jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

jest.mock('@/components/subscription/upgrade-modal', () => ({
  UpgradeModal: () => null,
}));

jest.mock('@/components/forms/category-form', () => ({
  CategoryForm: () => null,
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 36.5,
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TransactionForm prefill', () => {
  it('keeps the prefilled description and amount when the form opens', async () => {
    render(
      <TransactionForm
        isOpen
        onClose={jest.fn()}
        prefill={{
          type: TransactionType.EXPENSE,
          description: 'Café del journey',
          amountMinor: 123400,
          currencyCode: 'USD',
        }}
      />
    );

    // The mount reset effect must not wipe the prefill the initializer
    // already consumed (f-06: it did, clearing both fields).
    await waitFor(() => {
      expect(screen.getByLabelText('Descripción')).toHaveValue(
        'Café del journey'
      );
    });
    expect(screen.getByLabelText('Monto')).toHaveValue(1234);
  });
});

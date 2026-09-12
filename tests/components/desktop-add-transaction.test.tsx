import React from 'react';
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopAddTransaction } from '@/components/transactions/desktop-add-transaction';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}));

const mockRepository = {
  categories: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  accounts: {
    findByUserId: jest.fn().mockResolvedValue([]),
  },
  transactions: {
    create: jest.fn(),
  },
};

jest.mock('@/providers', () => ({
  useRepository: () => mockRepository,
}));

jest.mock('@/providers/repository-provider', () => ({
  useRepository: () => mockRepository,
}));

const authState = { user: { id: 'user-1' } };
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

jest.mock('@/lib/store', () => ({
  useNotifications: () => ({
    addNotification: jest.fn(),
  }),
  useAppStore: (selector: any) => selector({ selectedRateSource: 'bcv' }),
}));

jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 40,
}));

jest.mock('@/lib/hotkeys', () => ({
  useFormShortcuts: jest.fn(),
}));

jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: jest.fn(async ({ mutation }: any) => {
    return await mutation();
  }),
}));

jest.mock('@/components/forms/category-form', () => ({
  CategoryForm: () => <div data-testid="category-form" />,
}));

jest.mock('@/components/receipts', () => ({
  ReceiptScannerDropzone: ({ onScanSuccess, onReset }: any) => (
    <div data-testid="mock-receipt-scanner">
      <button
        data-testid="simulate-desktop-scan"
        onClick={() =>
          onScanSuccess({
            type: 'EXPENSE',
            amount: 80,
            currency: 'USD',
            suggestedDescription: 'Restaurante',
            suggestedCategoryName: 'Restaurante',
            suggestedAccountId: 'acc-1',
            referenceId: 'DESK-123',
          })
        }
      >
        Simulate Scan
      </button>
      <button data-testid="simulate-desktop-reset" onClick={() => onReset?.()}>
        Simulate Reset
      </button>
    </div>
  ),
}));

describe('DesktopAddTransaction recurring pre-selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with isRecurring as true when query param recurring=true is present', async () => {
    mockGet.mockReturnValueOnce('true');
    render(<DesktopAddTransaction />);

    const checkbox = await screen.findByLabelText(/Transacción Recurrente/i);
    expect(checkbox).toBeChecked();
  });

  it('renders with isRecurring as false when query param recurring is not true', async () => {
    mockGet.mockReturnValueOnce(null);
    render(<DesktopAddTransaction />);

    const checkbox = await screen.findByLabelText(/Transacción Recurrente/i);
    expect(checkbox).not.toBeChecked();
  });

  it('redirects to /transfers when Transferencia is selected and persists nothing', async () => {
    render(<DesktopAddTransaction />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Transferencia' })
    );

    expect(mockReplace).toHaveBeenCalledWith('/transfers');
    expect(mockRepository.transactions.create).not.toHaveBeenCalled();
  });

  it('renders confirmation banner when receipt is scanned and submits transaction', async () => {
    mockRepository.accounts.findByUserId.mockResolvedValueOnce([
      {
        id: 'acc-1',
        name: 'Banesco USD',
        currencyCode: 'USD',
        active: true,
        balance: 100,
      },
    ]);
    mockRepository.categories.findAll.mockResolvedValueOnce([
      { id: 'cat-1', name: 'Restaurante', kind: 'EXPENSE', active: true },
    ]);
    mockRepository.transactions.create.mockResolvedValueOnce({ id: 'tx-1' });

    render(<DesktopAddTransaction />);

    // Wait for accounts and categories to load
    await waitFor(() => {
      expect(mockRepository.categories.findAll).toHaveBeenCalled();
      expect(mockRepository.accounts.findByUserId).toHaveBeenCalled();
    });

    // Initially no scan banner
    expect(
      screen.queryByTestId('desktop-scan-confirm-banner')
    ).not.toBeInTheDocument();

    // Trigger scan
    fireEvent.click(screen.getByTestId('simulate-desktop-scan'));

    // Scan banner should be displayed
    const banner = await screen.findByTestId('desktop-scan-confirm-banner');
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByText('80 USD')).toBeInTheDocument();
    expect(within(banner).getByText(/Restaurante/i)).toBeInTheDocument();
    expect(within(banner).getByText(/Ref: #DESK-123/i)).toBeInTheDocument();

    // Confirm button in banner
    const confirmBtn = screen.getByRole('button', {
      name: /Confirmar y Guardar/i,
    });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRepository.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXPENSE',
          amountMinor: 8000,
          currencyCode: 'USD',
          description: 'Restaurante',
          accountId: 'acc-1',
        })
      );
    });

    // Resetting receipt clears the banner
    fireEvent.click(screen.getByTestId('simulate-desktop-reset'));
    expect(
      screen.queryByTestId('desktop-scan-confirm-banner')
    ).not.toBeInTheDocument();
  });
});

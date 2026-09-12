import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileAddTransaction } from '@/components/transactions/mobile-add-transaction';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';

// Mock next/navigation
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

// Mock useModal
jest.mock('@/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

// Mock useOptimizedData
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: () => ({
    transactions: [],
  }),
}));

// Mock CategoryForm
jest.mock('@/components/forms/category-form', () => ({
  CategoryForm: () => <div data-testid="category-form" />,
}));

// Mock ReceiptScannerDropzone to inspect callbacks & control scan outcomes
let mockDropzoneProps: any = {};
jest.mock('@/components/receipts', () => ({
  ReceiptScannerDropzone: (props: any) => {
    mockDropzoneProps = props;
    return (
      <div data-testid="mock-receipt-scanner-dropzone">
        <button
          data-testid="trigger-scan-success"
          onClick={() => {
            const mockResult: ScannedReceiptResult = {
              type: 'EXPENSE',
              amount: 35.5,
              currency: 'USD',
              suggestedDescription: 'Farmatodo',
              suggestedCategoryName: 'Salud',
              suggestedAccountId: 'acc-1',
              date: '2026-09-11',
              referenceId: 'REF-776655',
              items: [
                { description: 'Acetaminofen', quantity: 1, totalPrice: 5.5 },
                { description: 'Vitaminas', quantity: 2, totalPrice: 30 },
              ],
            };
            props.onScanSuccess(mockResult);
          }}
        >
          Trigger Scan Success
        </button>
        <button
          data-testid="trigger-scan-reset"
          onClick={() => props.onReset?.()}
        >
          Trigger Scan Reset
        </button>
      </div>
    );
  },
}));

// Mock useTransactionForm
const mockHandleSubmit = jest.fn();
const mockHandleCalculatorInputChange = jest.fn();
const mockHandleCalculatorClick = jest.fn();

let mockFormState: any = {
  type: 'EXPENSE',
  accountId: 'acc-1',
  categoryId: 'cat-1',
  amount: '',
  description: '',
  date: '2026-09-11',
  note: '',
  tags: '',
  isDebt: false,
  debtDirection: '',
  debtStatus: 'OPEN',
  counterpartyName: '',
  settledAt: '',
  deductFromAccount: true,
  sourceAccountId: '',
  isRecurring: false,
  frequency: 'monthly',
  endDate: '',
};

const mockAccounts = [
  {
    id: 'acc-1',
    name: 'Banesco USD',
    currencyCode: 'USD',
    type: 'BANK',
    balance: 10000,
    active: true,
  },
  {
    id: 'acc-2',
    name: 'Efectivo VES',
    currencyCode: 'VES',
    type: 'CASH',
    balance: 50000,
    active: true,
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Salud',
    kind: 'EXPENSE',
    icon: 'pill',
    color: '#10B981',
  },
  {
    id: 'cat-2',
    name: 'Comida',
    kind: 'EXPENSE',
    icon: 'food',
    color: '#EF4444',
  },
];

jest.mock('@/hooks/use-transaction-form', () => {
  const actual = jest.requireActual('@/hooks/use-transaction-form');
  return {
    ...actual,
    useTransactionForm: () => {
      const [formData, setFormDataInternal] = useState(mockFormState);
      const [calcVal, setCalcVal] = useState(formData.amount || '0');

      return {
        formData,
        setFormData: (action: any) => {
          setFormDataInternal((prev: any) => {
            const next = typeof action === 'function' ? action(prev) : action;
            mockFormState = next;
            return next;
          });
        },
        calculatorValue: calcVal,
        loading: false,
        categories: mockCategories,
        accounts: mockAccounts,
        loadingCategories: false,
        loadingAccounts: false,
        activeUsdVes: 40,
        selectedRateSource: 'bcv',
        handleCalculatorClick: mockHandleCalculatorClick,
        handleCalculatorInputChange: (val: string) => {
          setCalcVal(val);
          mockHandleCalculatorInputChange(val);
        },
        handleCategorySaved: jest.fn(),
        handleSubmit: mockHandleSubmit,
        getCategoriesByType: () => mockCategories,
        getCategoryKindForTransaction: () => 'EXPENSE',
        getSelectedAccount: () =>
          mockAccounts.find((a) => a.id === formData.accountId),
        canShowDebtFields: true,
      };
    },
  };
});

describe('MobileAddTransaction Scan-to-Confirm Fast Track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormState = {
      type: 'EXPENSE',
      accountId: 'acc-1',
      categoryId: 'cat-1',
      amount: '',
      description: '',
      date: '2026-09-11',
      note: '',
      tags: '',
      isDebt: false,
      debtDirection: '',
      debtStatus: 'OPEN',
      counterpartyName: '',
      settledAt: '',
      deductFromAccount: true,
      sourceAccountId: '',
      isRecurring: false,
      frequency: 'monthly',
      endDate: '',
    };
  });

  it('renders initial manual form with calculator keypad when no receipt is scanned', () => {
    render(<MobileAddTransaction />);

    expect(
      screen.getByTestId('mock-receipt-scanner-dropzone')
    ).toBeInTheDocument();
    // Scan-to-confirm card should NOT be present initially
    expect(
      screen.queryByTestId('scan-to-confirm-card')
    ).not.toBeInTheDocument();
    // Calculator keypad should be present
    expect(screen.getByLabelText('Limpiar')).toBeInTheDocument();
  });

  it('renders Scan-to-Confirm card after scanning, collapses keypad, and shows 1-tap submit', () => {
    render(<MobileAddTransaction />);

    // Trigger scan
    fireEvent.click(screen.getByTestId('trigger-scan-success'));

    // Scan-to-Confirm card MUST be rendered
    const card = screen.getByTestId('scan-to-confirm-card');
    expect(card).toBeInTheDocument();

    // Verify key fields in the Scan-to-Confirm card
    expect(screen.getByText('35.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Farmatodo')).toBeInTheDocument();
    expect(screen.getByText(/2 artículos/i)).toBeInTheDocument();
    expect(screen.getByText('Ref: #REF-776655')).toBeInTheDocument();

    // The 16-key calculator keypad must be collapsed / hidden
    expect(screen.queryByLabelText('Limpiar')).not.toBeInTheDocument();

    // Primary confirm button inside the card is rendered
    const confirmButtons = screen.getAllByRole('button', {
      name: /Confirmar y Guardar/i,
    });
    expect(confirmButtons.length).toBeGreaterThan(0);

    // Clicking confirm button submits the form directly
    fireEvent.click(confirmButtons[0]);
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('allows opening detailed advanced mode and returning back to fast track', () => {
    render(<MobileAddTransaction />);

    // Trigger scan
    fireEvent.click(screen.getByTestId('trigger-scan-success'));
    expect(screen.getByTestId('scan-to-confirm-card')).toBeInTheDocument();

    // Click "Editar detalles avanzados"
    const editAdvancedBtn = screen.getByRole('button', {
      name: /Editar detalles avanzados/i,
    });
    fireEvent.click(editAdvancedBtn);

    // In detailed mode: Scan-to-Confirm card is collapsed, detailed form + calculator are visible
    expect(
      screen.queryByTestId('scan-to-confirm-card')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Limpiar')).toBeInTheDocument();
    expect(screen.getByText(/Modo detallado activo/i)).toBeInTheDocument();

    // Click "Volver a Confirmación Rápida"
    const returnBtn = screen.getByRole('button', {
      name: /Volver a Confirmación Rápida/i,
    });
    fireEvent.click(returnBtn);

    // Fast-track card is restored and keypad collapsed again
    expect(screen.getByTestId('scan-to-confirm-card')).toBeInTheDocument();
    expect(screen.queryByLabelText('Limpiar')).not.toBeInTheDocument();
  });

  it('resets to manual form when receipt is dismissed/cleared', () => {
    render(<MobileAddTransaction />);

    // Trigger scan
    fireEvent.click(screen.getByTestId('trigger-scan-success'));
    expect(screen.getByTestId('scan-to-confirm-card')).toBeInTheDocument();

    // Trigger reset callback from dropzone
    fireEvent.click(screen.getByTestId('trigger-scan-reset'));

    // Scan-to-confirm card should be removed, normal keypad visible
    expect(
      screen.queryByTestId('scan-to-confirm-card')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Limpiar')).toBeInTheDocument();
  });
});

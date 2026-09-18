import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  BatchReceiptUploaderModal,
  findMatchingCategory,
  findMatchingAccount,
  annotateDuplicates,
  MAX_BATCH_RECEIPTS,
} from '@/components/receipts/batch-receipt-uploader-modal';
import type { BatchReceiptItem } from '@/components/receipts/batch-receipt-uploader-modal';
import { toast } from 'sonner';
import { runFinancialMutation } from '@/lib/finance/financial-data-sync';
import type { Account, Category, Transaction } from '@/types';
import { AccountType, CategoryKind, TransactionType } from '@/types';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';

// Mock Sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock NativeBackNavigation
jest.mock('@/components/providers/native-back-navigation', () => ({
  useNativeBackNavigation: () => jest.fn(),
}));

// Mock image compression
jest.mock('@/hooks/use-receipt-scanner', () => ({
  compressImage: jest
    .fn()
    .mockResolvedValue('data:image/jpeg;base64,mockedbase64'),
}));

// Mock financial mutation runner
jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: jest.fn().mockImplementation(async ({ mutation }) => {
    return await mutation();
  }),
}));

// Mock active rate
jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 65.5,
}));

// Mock repository
const mockCreateTransaction = jest.fn().mockResolvedValue({ id: 'tx-new-1' });
const mockRepository = {
  transactions: {
    create: mockCreateTransaction,
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
  },
  accounts: {
    findByUserId: jest.fn().mockResolvedValue([]),
  },
  categories: {
    findAll: jest.fn().mockResolvedValue([]),
  },
};

jest.mock('@/providers', () => ({
  useRepository: () => mockRepository,
}));

// Mock auth
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-test-123' } }),
}));

// Mock URL object methods
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url-' + Math.random());
  global.URL.revokeObjectURL = jest.fn();
});

const mockAccounts: Account[] = [
  {
    id: 'acc-ves-1',
    userId: 'user-test-123',
    name: 'Banesco VES',
    type: AccountType.BANK,
    currencyCode: 'VES',
    balance: 50000,
    active: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'acc-usd-1',
    userId: 'user-test-123',
    name: 'Efectivo USD',
    type: AccountType.CASH,
    currencyCode: 'USD',
    balance: 20000,
    active: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCategories: Category[] = [
  {
    id: 'cat-food',
    name: 'Alimentación',
    kind: CategoryKind.EXPENSE,
    color: '#10B981',
    icon: '🍔',
    isSystem: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cat-services',
    name: 'Servicios',
    kind: CategoryKind.EXPENSE,
    color: '#3B82F6',
    icon: '💡',
    isSystem: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

// Mock useOptimizedData
jest.mock('@/hooks/use-optimized-data', () => ({
  useOptimizedData: () => ({
    accounts: mockAccounts,
    categories: mockCategories,
    transactions: [],
    loading: false,
    loadAllData: jest.fn(),
  }),
}));

describe('findMatchingCategory & findMatchingAccount helper utilities', () => {
  it('matches category by exact name and case insensitivity', () => {
    expect(findMatchingCategory('Alimentación', mockCategories)).toBe(
      'cat-food'
    );
    expect(findMatchingCategory('alimentación', mockCategories)).toBe(
      'cat-food'
    );
    expect(findMatchingCategory('servicios', mockCategories)).toBe(
      'cat-services'
    );
    expect(findMatchingCategory('Desconocido', mockCategories)).toBeUndefined();
    expect(findMatchingCategory(undefined, mockCategories)).toBeUndefined();
  });

  it('matches category by partial substring', () => {
    expect(findMatchingCategory('Alimentos y Bebidas', mockCategories)).toBe(
      'cat-food'
    );
  });

  it('matches account using suggestedAccountId if valid', () => {
    const result: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 100,
      currency: 'VES',
      date: '2026-09-11',
      suggestedAccountId: 'acc-ves-1',
      accountMatchConfidence: 'HIGH',
      suggestedDescription: 'Supermercado',
      formattedNotes: '',
      tags: [],
    };
    expect(findMatchingAccount(result, mockAccounts)).toBe('acc-ves-1');
  });

  it('matches account by bank/platform name alias', () => {
    const result: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 150,
      currency: 'VES',
      date: '2026-09-11',
      bankOrPlatform: 'Banesco',
      accountMatchConfidence: 'NONE',
      suggestedDescription: 'Farmatodo',
      formattedNotes: '',
      tags: [],
    };
    expect(findMatchingAccount(result, mockAccounts)).toBe('acc-ves-1');
  });

  it('matches account by single currency candidate', () => {
    const result: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'MEDIUM',
      amount: 25,
      currency: 'USD',
      date: '2026-09-11',
      accountMatchConfidence: 'NONE',
      suggestedDescription: 'Almuerzo',
      formattedNotes: '',
      tags: [],
    };
    // Only one USD account in mockAccounts
    expect(findMatchingAccount(result, mockAccounts)).toBe('acc-usd-1');
  });
});

describe('BatchReceiptUploaderModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          type: 'EXPENSE',
          confidence: 'HIGH',
          amount: 50,
          currency: 'VES',
          date: '2026-09-11',
          suggestedDescription: 'Comprobante',
          suggestedCategoryName: 'Alimentación',
          suggestedAccountId: 'acc-ves-1',
          accountMatchConfidence: 'HIGH',
          formattedNotes: '',
          tags: [],
        },
      }),
    });
  });

  it('renders modal when isOpen is true with accessible file input', () => {
    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    expect(
      screen.getByText('Carga de Comprobantes en Lote')
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Hasta ${MAX_BATCH_RECEIPTS} fotos`)
    ).toBeInTheDocument();

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveClass('sr-only');
    expect(input).not.toHaveAttribute('capture');
    expect(input.getAttribute('accept')).toContain('image/');
  });

  it('enforces 20 receipts hard cap and warns with toast when user selects more', async () => {
    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Create 24 mock image files
    const files = Array.from({ length: 24 }, (_, i) => {
      return new File([`data-${i}`], `receipt-${i}.jpg`, {
        type: 'image/jpeg',
      });
    });

    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });

    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('Límite de 20 comprobantes alcanzado')
    );
  });

  it('rejects non-image files with an error toast', () => {
    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const pdfFile = new File(['pdf-data'], 'document.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(input, { target: { files: [pdfFile] } });

    expect(toast.error).toHaveBeenCalledWith(
      'Solo se permiten archivos de imagen (JPG, PNG, WEBP).'
    );
  });

  it('processes uploaded images via /api/ai/scan-receipt with bounded concurrency and pre-fills fast-fill fields', async () => {
    const mockScanResponseData: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 350.75,
      currency: 'VES',
      date: '2026-09-10',
      referenceId: '7891011',
      suggestedDescription: 'Automercado Plaza',
      suggestedCategoryName: 'Alimentación',
      suggestedAccountId: 'acc-ves-1',
      accountMatchConfidence: 'HIGH',
      formattedNotes: '',
      tags: ['supermercado'],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockScanResponseData,
      }),
    });

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file1 = new File(['image-content-1'], 'receipt-plaza.jpg', {
      type: 'image/jpeg',
    });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file1] } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/scan-receipt',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    // Verify fast-fill pre-fills:
    await waitFor(() => {
      expect(screen.getByDisplayValue('Automercado Plaza')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('350.75')).toBeInTheDocument();
    expect(screen.getByText('Ref: #7891011')).toBeInTheDocument();
    expect(screen.getByText('Listo')).toBeInTheDocument();

    // Verify account and category pre-filled
    const categorySelect = screen.getByDisplayValue('Alimentación');
    expect(categorySelect).toBeInTheDocument();

    const accountSelect = screen.getByDisplayValue('Banesco VES (VES)');
    expect(accountSelect).toBeInTheDocument();
  });

  it('highlights account dropdown when account is not detected', async () => {
    const mockUnknownAccountScan: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'MEDIUM',
      amount: 80,
      currency: 'EUR', // No EUR account exists in mockAccounts
      date: '2026-09-10',
      suggestedDescription: 'Compra Online',
      accountMatchConfidence: 'NONE',
      formattedNotes: '',
      tags: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockUnknownAccountScan,
      }),
    });

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['img'], 'eur-receipt.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Compra Online')).toBeInTheDocument();
    });

    // Should display the amber "Indicar" badge
    expect(screen.getByText('Indicar')).toBeInTheDocument();
  });

  it('allows editing description, category, and account, and removing an item', async () => {
    const mockScanData: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 120,
      currency: 'VES',
      date: '2026-09-11',
      suggestedDescription: 'Farmacia',
      suggestedCategoryName: 'Alimentación',
      suggestedAccountId: 'acc-ves-1',
      accountMatchConfidence: 'HIGH',
      formattedNotes: '',
      tags: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockScanData,
      }),
    });

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['img'], 'farma.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Farmacia')).toBeInTheDocument();
    });

    // Edit description (Motivo)
    const descInput = screen.getByDisplayValue('Farmacia');
    fireEvent.change(descInput, {
      target: { value: 'Medicamentos Farmatodo' },
    });
    expect(
      screen.getByDisplayValue('Medicamentos Farmatodo')
    ).toBeInTheDocument();

    // Remove item
    const deleteBtn = screen.getByLabelText('Eliminar comprobante 1');
    fireEvent.click(deleteBtn);

    // Empty state should return
    expect(
      screen.getByText('Arrastra hasta 20 comprobantes aquí')
    ).toBeInTheDocument();
  });

  it('submits valid transactions in batch through runFinancialMutation', async () => {
    const mockScanData: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 45.5,
      currency: 'VES',
      date: '2026-09-11',
      referenceId: '998877',
      suggestedDescription: 'Almuerzo Rápido',
      suggestedCategoryName: 'Alimentación',
      suggestedAccountId: 'acc-ves-1',
      accountMatchConfidence: 'HIGH',
      formattedNotes: '',
      tags: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockScanData,
      }),
    });

    const mockOnSuccess = jest.fn();
    const mockOnClose = jest.fn();

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['img'], 'almuerzo.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Almuerzo Rápido')).toBeInTheDocument();
    });

    const submitBtn = screen.getByText('Guardar 1 Transacción');
    expect(submitBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(runFinancialMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-test-123',
          domains: ['transactions', 'accounts', 'budgets'],
        })
      );
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.EXPENSE,
          accountId: 'acc-ves-1',
          categoryId: 'cat-food',
          description: 'Almuerzo Rápido',
          amountMinor: 4550, // 45.5 * 100 minor units
          date: '2026-09-11',
          note: 'Comprobante Ref: 998877',
        })
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      '1 transacción guardada exitosamente'
    );
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clicking thumbnail opens image preview lightbox modal', async () => {
    const mockScanData: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 10,
      currency: 'USD',
      date: '2026-09-11',
      suggestedDescription: 'Café',
      suggestedAccountId: 'acc-usd-1',
      accountMatchConfidence: 'HIGH',
      formattedNotes: '',
      tags: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockScanData,
      }),
    });

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['dummy-coffee'], 'cafe.png', { type: 'image/png' });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Café')).toBeInTheDocument();
    });

    const thumbnailBtn = screen.getByLabelText('Ver comprobante 1');
    fireEvent.click(thumbnailBtn);

    // Lightbox modal should be rendered
    expect(
      screen.getByRole('dialog', { name: 'Vista previa de comprobante' })
    ).toBeInTheDocument();
    expect(screen.getByText('cafe.png')).toBeInTheDocument();

    // Close preview
    const closePreviewBtn = screen.getByLabelText('Cerrar vista previa');
    fireEvent.click(closePreviewBtn);
    expect(
      screen.queryByRole('dialog', { name: 'Vista previa de comprobante' })
    ).not.toBeInTheDocument();
  });

  it('renders line items badge on receipt card when scanner extracts products', async () => {
    const mockScanDataWithItems: ScannedReceiptResult = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 2,
      currency: 'USD',
      date: '2026-09-11',
      suggestedDescription: 'Compra Leche',
      suggestedAccountId: 'acc-usd-1',
      accountMatchConfidence: 'HIGH',
      formattedNotes: '',
      tags: ['factura-detallada'],
      items: [{ description: 'Leche', totalPrice: 2 }],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockScanDataWithItems,
      }),
    });

    render(
      <BatchReceiptUploaderModal
        isOpen={true}
        onClose={jest.fn()}
        accounts={mockAccounts}
        categories={mockCategories}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['img-data'], 'recibo_leche.jpg', {
      type: 'image/jpeg',
    });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByTestId('batch-item-count-badge')).toBeInTheDocument();
    });

    const badge = screen.getByTestId('batch-item-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/artículo/);
  });

  describe('Duplicate Detection & Prevention', () => {
    it('annotateDuplicates correctly flags intra-batch duplicates by reference', () => {
      const item1: BatchReceiptItem = {
        id: 'item-1',
        file: new File(['f1'], 'pago1.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:url1',
        status: 'done',
        amount: 50,
        currency: 'VES',
        date: '2026-09-11',
        type: TransactionType.EXPENSE,
        referenceId: '04928172',
        description: 'Almuerzo 1',
        categoryId: 'cat-food',
        accountId: 'acc-ves-1',
        accountNeedsAttention: false,
      };

      const item2: BatchReceiptItem = {
        id: 'item-2',
        file: new File(['f2'], 'pago2.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:url2',
        status: 'done',
        amount: 50,
        currency: 'VES',
        date: '2026-09-11',
        type: TransactionType.EXPENSE,
        referenceId: '04928172', // identical reference
        description: 'Almuerzo 2',
        categoryId: 'cat-food',
        accountId: 'acc-ves-1',
        accountNeedsAttention: false,
      };

      const annotated = annotateDuplicates([item1, item2], []);

      expect(annotated[0].isDuplicate).toBe(false);
      expect(annotated[0].isIncluded).toBe(true);

      expect(annotated[1].isDuplicate).toBe(true);
      expect(annotated[1].duplicateType).toBe('INTRA_BATCH');
      expect(annotated[1].isIncluded).toBe(false);
      expect(annotated[1].duplicateReason).toContain('04928172');
    });

    it('annotateDuplicates correctly flags history duplicates against existing transactions', () => {
      const existingTx: Transaction[] = [
        {
          id: 'tx-old-1',
          userId: 'user-test-123',
          type: TransactionType.EXPENSE,
          accountId: 'acc-ves-1',
          currencyCode: 'VES',
          amountMinor: 5000,
          date: '2026-09-11',
          description: 'Farmatodo',
          note: 'Comprobante Ref: 04928172',
          createdAt: '2026-09-11',
          updatedAt: '2026-09-11',
        },
      ];

      const item: BatchReceiptItem = {
        id: 'item-1',
        file: new File(['f1'], 'farmatodo.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:url1',
        status: 'done',
        amount: 50,
        currency: 'VES',
        date: '2026-09-11',
        type: TransactionType.EXPENSE,
        referenceId: '04928172',
        description: 'Farmatodo Compra',
        categoryId: 'cat-food',
        accountId: 'acc-ves-1',
        accountNeedsAttention: false,
      };

      const annotated = annotateDuplicates([item], existingTx);

      expect(annotated[0].isDuplicate).toBe(true);
      expect(annotated[0].duplicateType).toBe('HISTORY');
      expect(annotated[0].isIncluded).toBe(false);
      expect(annotated[0].duplicateReason).toContain('04928172');
    });

    it('preserves user manual inclusion override when item is re-annotated', () => {
      const item: BatchReceiptItem = {
        id: 'item-dup',
        file: new File(['f1'], 'pago.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:url1',
        status: 'done',
        amount: 50,
        currency: 'VES',
        date: '2026-09-11',
        type: TransactionType.EXPENSE,
        referenceId: '04928172',
        description: 'Pago intencional',
        categoryId: 'cat-food',
        accountId: 'acc-ves-1',
        accountNeedsAttention: false,
        isDuplicate: true,
        isIncluded: true, // Manually included by user
      };

      const existingTx: Transaction[] = [
        {
          id: 'tx-old-1',
          userId: 'user-test-123',
          type: TransactionType.EXPENSE,
          accountId: 'acc-ves-1',
          currencyCode: 'VES',
          amountMinor: 5000,
          date: '2026-09-11',
          description: 'Farmatodo',
          note: 'Comprobante Ref: 04928172',
          createdAt: '2026-09-11',
          updatedAt: '2026-09-11',
        },
      ];

      const annotated = annotateDuplicates([item], existingTx);
      expect(annotated[0].isDuplicate).toBe(true);
      expect(annotated[0].isIncluded).toBe(true);
    });

    it('detects intra-batch duplicate receipts in UI, shows banner, and excludes duplicate from batch submit', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(async () => {
        const currentCall = ++callCount;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              type: 'EXPENSE',
              confidence: 'HIGH',
              amount: 100,
              currency: 'VES',
              date: '2026-09-11',
              referenceId: 'REF-SAME-12345',
              suggestedDescription: `Pago ${currentCall}`,
              suggestedAccountId: 'acc-ves-1',
              accountMatchConfidence: 'HIGH',
              formattedNotes: '',
              tags: [],
            },
          }),
        };
      });

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file1 = new File(['img1'], 'pago1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['img2'], 'pago2.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1, file2] } });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pago 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Pago 2')).toBeInTheDocument();
      });

      // Duplicates banner should appear
      await waitFor(() => {
        expect(
          screen.getByTestId('batch-duplicates-banner')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText('Se detectaron 1 comprobante(s) duplicado(s)')
      ).toBeInTheDocument();

      // Second card should have duplicate badge and alert
      expect(screen.getByTestId('duplicate-badge')).toBeInTheDocument();
      expect(screen.getByTestId('duplicate-card-alert')).toBeInTheDocument();

      // Submit button should only count 1 transaction (the non-duplicate one)
      expect(screen.getByText('Guardar 1 Transacción')).toBeInTheDocument();

      // Discard duplicate button works
      const discardBtn = screen.getByText('Descartar 1 duplicados');
      await act(async () => {
        fireEvent.click(discardBtn);
      });

      // Banner should disappear after discarding
      await waitFor(() => {
        expect(
          screen.queryByTestId('batch-duplicates-banner')
        ).not.toBeInTheDocument();
      });
      expect(toast.success).toHaveBeenCalledWith(
        '1 comprobante(s) duplicado(s) descartado(s)'
      );
    });

    it('detects history duplicate in UI when receipt matches existingTransactions', async () => {
      const existingTx: Transaction[] = [
        {
          id: 'tx-old-banesco',
          userId: 'user-test-123',
          type: TransactionType.EXPENSE,
          accountId: 'acc-ves-1',
          currencyCode: 'VES',
          amountMinor: 25000,
          date: '2026-09-11',
          description: 'Supermercado Banesco',
          note: 'Comprobante Ref: 77665544',
          createdAt: '2026-09-11',
          updatedAt: '2026-09-11',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            type: 'EXPENSE',
            confidence: 'HIGH',
            amount: 250,
            currency: 'VES',
            date: '2026-09-11',
            referenceId: '77665544',
            suggestedDescription: 'Supermercado Banesco',
            suggestedAccountId: 'acc-ves-1',
            accountMatchConfidence: 'HIGH',
            formattedNotes: '',
            tags: [],
          },
        }),
      });

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
          existingTransactions={existingTx}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['img-old'], 'recibo_antiguo.jpg', {
        type: 'image/jpeg',
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('duplicate-badge')).toBeInTheDocument();
      });

      expect(screen.getByText('Duplicado en historial')).toBeInTheDocument();
      expect(screen.getByTestId('duplicate-card-alert')).toHaveTextContent(
        'Ya existe una transacción con la referencia 77665544'
      );

      // Because it's a duplicate and unchecked, valid items is 0
      const saveButton = screen.getByRole('button', { name: /Guardar 0/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveClass('disabled:bg-muted');
      expect(saveButton).toHaveClass('disabled:opacity-100');

      // If user manually checks "Incluir de todos modos", it becomes valid to submit
      const includeCheckbox = screen.getByLabelText('Incluir comprobante 1');
      await act(async () => {
        fireEvent.click(includeCheckbox);
      });

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Guardar 1 Transacción/i })
        ).toBeEnabled();
      });
    });
  });

  describe('Batch UI states, checklist, and individual confirmation', () => {
    it('displays the Spanish ready status and extracted checklist when all fields are complete', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 85.0,
        currency: 'USD',
        date: '2026-09-15',
        suggestedDescription: 'Walmart Express',
        suggestedCategoryName: 'Alimentación',
        suggestedAccountId: 'acc-usd-1',
        accountMatchConfidence: 'HIGH',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockScanData,
        }),
      });

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['walmart'], 'walmart.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('status-badge-ready')).toBeInTheDocument();
      });

      expect(screen.getByText('Listo')).toBeInTheDocument();
      expect(screen.getByText(/Monto: 85 USD/i)).toBeInTheDocument();

      const accordionToggle = screen.getByRole('button', {
        name: /editar \/ ver campos|ocultar campos/i,
      });
      const fieldsId = accordionToggle.getAttribute('aria-controls');
      expect(fieldsId).toBeTruthy();
      expect(document.getElementById(fieldsId!)).toHaveAttribute(
        'aria-labelledby',
        accordionToggle.id
      );
      expect(
        screen.getByText(/Comercio: Walmart Express/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Fecha: 2026-09-15/i)).toBeInTheDocument();
      expect(screen.getByText(/Cuenta asignada/i)).toBeInTheDocument();
    });

    it('displays missing information status in Spanish when date or amount is missing', async () => {
      const mockIncompleteScan: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'MEDIUM',
        amount: 52.3,
        currency: 'USD',
        date: '', // Missing date
        suggestedDescription: 'Shell',
        suggestedCategoryName: 'Alimentación',
        suggestedAccountId: 'acc-usd-1',
        accountMatchConfidence: 'HIGH',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockIncompleteScan,
        }),
      });

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['shell'], 'shell.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('status-badge-missing-info')
        ).toBeInTheDocument();
      });

      expect(screen.getByTestId('status-badge-missing-info')).toHaveTextContent(
        'Falta información'
      );
      expect(screen.getByText(/Falta fecha/i)).toBeInTheDocument();
      expect(
        screen.getByText(/requieren información adicional/i)
      ).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('⚠');

      // Click "Hoy" to fill date
      const hoyBtn = screen.getByText('Hoy');
      fireEvent.click(hoyBtn);

      // Now status transitions to ready
      await waitFor(() => {
        expect(screen.getByTestId('status-badge-ready')).toBeInTheDocument();
      });
    });

    it('allows toggling between Gasto and Ingreso', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 100,
        currency: 'USD',
        date: '2026-09-14',
        suggestedDescription: 'Cobro Cliente',
        suggestedCategoryName: 'Salario',
        suggestedAccountId: 'acc-usd-1',
        accountMatchConfidence: 'HIGH',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockScanData,
        }),
      });

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['doc'], 'receipt.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Cobro Cliente')).toBeInTheDocument();
      });

      const ingresoBtn = screen.getByRole('button', { name: 'Ingreso' });
      fireEvent.click(ingresoBtn);

      expect(ingresoBtn.className).toContain('text-emerald-600');
    });

    it('allows confirming an individual transaction from its card', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 43.21,
        currency: 'USD',
        date: '2026-09-15',
        suggestedDescription: 'Walmart',
        suggestedCategoryName: 'Alimentación',
        suggestedAccountId: 'acc-usd-1',
        accountMatchConfidence: 'HIGH',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: mockScanData,
        }),
      });

      const mockOnSuccess = jest.fn();

      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={mockOnSuccess}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['img'], 'walmart.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Walmart')).toBeInTheDocument();
      });

      // Find the card's Confirmar button
      const confirmCardBtn = screen.getByRole('button', {
        name: 'Confirmar comprobante 1',
      });
      expect(confirmCardBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(confirmCardBtn);
      });

      await waitFor(() => {
        expect(runFinancialMutation).toHaveBeenCalled();
        expect(mockCreateTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            type: TransactionType.EXPENSE,
            accountId: 'acc-usd-1',
            description: 'Walmart',
            amountMinor: 4321,
            date: '2026-09-15',
          })
        );
      });

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Transacción guardada exitosamente')
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});

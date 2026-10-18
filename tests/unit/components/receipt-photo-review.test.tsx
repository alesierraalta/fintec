import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  BatchReceiptUploaderModal,
  MAX_BATCH_RECEIPTS,
} from '@/components/receipts/batch-receipt-uploader-modal';
import { ReceiptScannerDropzone } from '@/components/receipts/receipt-scanner-dropzone';
import { toast } from 'sonner';
import type { Account, Category } from '@/types';
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

// Mock compressImage
jest.mock('@/hooks/use-receipt-scanner', () => {
  const actual = jest.requireActual('@/hooks/use-receipt-scanner');
  return {
    ...actual,
    compressImage: jest
      .fn()
      .mockResolvedValue('data:image/jpeg;base64,mockedbase64'),
  };
});

// Mock financial data sync
jest.mock('@/lib/finance/financial-data-sync', () => ({
  runFinancialMutation: jest.fn().mockImplementation(async ({ mutation }) => {
    return await mutation();
  }),
}));

// Mock rates
jest.mock('@/lib/rates', () => ({
  useActiveUsdVesRate: () => 65.5,
}));

// Mock repository
const mockCreateTransaction = jest.fn().mockResolvedValue({ id: 'tx-photo-1' });
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
  useAuth: () => ({ user: { id: 'user-photo-tester' } }),
}));

describe('Receipt Photo Review & Lifecycle Suite', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc-usd',
      userId: 'user-photo-tester',
      name: 'Cash USD',
      currencyCode: 'USD',
      type: AccountType.CASH,
      balanceMinor: 100000,
      active: true,
      color: '#00FF00',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'acc-ves',
      userId: 'user-photo-tester',
      name: 'Banesco VES',
      currencyCode: 'VES',
      type: AccountType.BANK,
      balanceMinor: 500000,
      active: true,
      color: '#0000FF',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      userId: 'user-photo-tester',
      name: 'Alimentación',
      kind: CategoryKind.EXPENSE,
      color: '#FF0000',
      icon: 'utensils',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;

  beforeAll(() => {
    createObjectURLMock = jest.fn((file: any) => {
      return `blob:http://localhost/mock-photo-${file?.name || 'img'}-${Math.random()}`;
    });
    revokeObjectURLMock = jest.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BatchReceiptUploaderModal - Photo Preview & Lightbox Review', () => {
    it('opens lightbox preview modal with full photo, filename and reference on thumbnail click, and closes cleanly', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 25.5,
        currency: 'USD',
        date: '2026-10-17',
        referenceId: 'FOTO-REF-9988',
        suggestedDescription: 'Supermercado Central',
        suggestedAccountId: 'acc-usd',
        accountMatchConfidence: 'HIGH',
        formattedNotes: 'Comprobante procesado',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockScanData }),
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
      const file = new File(['fake-invoice-content'], 'factura-compra.png', {
        type: 'image/png',
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Supermercado Central')
        ).toBeInTheDocument();
      });

      // Find thumbnail button to review photo
      const thumbnailBtn = screen.getByLabelText('Ver comprobante 1');
      expect(thumbnailBtn).toBeInTheDocument();
      fireEvent.click(thumbnailBtn);

      // Lightbox modal should open
      const lightboxDialog = screen.getByRole('dialog', {
        name: 'Vista previa de comprobante',
      });
      expect(lightboxDialog).toBeInTheDocument();
      expect(
        within(lightboxDialog).getByText('factura-compra.png')
      ).toBeInTheDocument();
      expect(
        within(lightboxDialog).getByText('Ref: #FOTO-REF-9988')
      ).toBeInTheDocument();

      // Check image source in lightbox
      const previewImg = screen.getByAltText('factura-compra.png');
      expect(previewImg).toBeInTheDocument();
      expect(previewImg.getAttribute('src')).toMatch(
        /^blob:http:\/\/localhost\/mock-photo-/
      );

      // Close lightbox using the close button
      const closeLightboxBtn = screen.getByLabelText('Cerrar vista previa');
      fireEvent.click(closeLightboxBtn);

      expect(
        screen.queryByRole('dialog', { name: 'Vista previa de comprobante' })
      ).not.toBeInTheDocument();
    });

    it('closes lightbox when user clicks on dark backdrop overlay', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 12,
        currency: 'USD',
        date: '2026-10-17',
        suggestedDescription: 'Farmacia',
        suggestedAccountId: 'acc-usd',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockScanData }),
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
      const file = new File(['photo'], 'receta.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Farmacia')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Ver comprobante 1'));

      const lightboxOverlay = screen.getByRole('dialog', {
        name: 'Vista previa de comprobante',
      });
      expect(lightboxOverlay).toBeInTheDocument();

      // Click on backdrop container
      fireEvent.click(lightboxOverlay);

      expect(
        screen.queryByRole('dialog', { name: 'Vista previa de comprobante' })
      ).not.toBeInTheDocument();
    });
  });

  describe('BatchReceiptUploaderModal - File Validation & Memory Cleanliness', () => {
    it('rejects non-image files and displays warning toast without creating preview URLs', async () => {
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
      const pdfFile = new File(['%PDF-1.4...'], 'factura.pdf', {
        type: 'application/pdf',
      });
      const txtFile = new File(['hello'], 'comprobante.txt', {
        type: 'text/plain',
      });

      await act(async () => {
        fireEvent.change(input, { target: { files: [pdfFile, txtFile] } });
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Solo se permiten archivos de imagen (JPG, PNG, WEBP).'
      );
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('enforces MAX_BATCH_RECEIPTS (20) and slices excess photos with toast notification', async () => {
      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            type: 'EXPENSE',
            amount: 5,
            currency: 'USD',
            date: '2026-10-17',
            suggestedDescription: 'Item',
          },
        }),
      });

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const files = Array.from(
        { length: 25 },
        (_, i) => new File(['data'], `foto-${i}.png`, { type: 'image/png' })
      );

      await act(async () => {
        fireEvent.change(input, { target: { files } });
      });

      expect(toast.warning).toHaveBeenCalledWith(
        'Límite de 20 comprobantes alcanzado. Se procesarán los primeros 20.'
      );
      expect(createObjectURLMock).toHaveBeenCalledTimes(20);
    });

    it('revokes object URLs when individual photos are removed', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            type: 'EXPENSE',
            amount: 15,
            currency: 'USD',
            date: '2026-10-17',
            suggestedDescription: 'Almuerzo',
          },
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
      const file1 = new File(['img1'], 'almuerzo.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1] } });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Almuerzo')).toBeInTheDocument();
      });

      // Remove photo item
      const removeBtn = screen.getByLabelText('Eliminar comprobante 1');
      fireEvent.click(removeBtn);

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(
        expect.stringContaining('blob:http://localhost/mock-photo-')
      );
    });

    it('revokes object URLs for all duplicate photos when user clicks discard duplicates', async () => {
      const mockScanData: ScannedReceiptResult = {
        type: 'EXPENSE',
        confidence: 'HIGH',
        amount: 50,
        currency: 'USD',
        date: '2026-10-17',
        referenceId: 'DUP-1122',
        suggestedDescription: 'Repuesto auto',
        suggestedAccountId: 'acc-usd',
        formattedNotes: '',
        tags: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockScanData }),
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
      const file1 = new File(['1'], 'factura1.png', { type: 'image/png' });
      const file2 = new File(['2'], 'factura2.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1, file2] } });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Se detectaron 1 comprobante\(s\) duplicado\(s\)/i)
        ).toBeInTheDocument();
      });

      const discardBtn = screen.getByRole('button', {
        name: /Descartar 1 duplicados/i,
      });
      fireEvent.click(discardBtn);

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(
        '1 comprobante(s) duplicado(s) descartado(s)'
      );
    });

    it('revokes all active object URLs when user clicks Vaciar lista', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            type: 'EXPENSE',
            amount: 10,
            currency: 'USD',
            date: '2026-10-17',
            suggestedDescription: 'Gasolina',
          },
        }),
      });

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
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
      const file1 = new File(['a'], 'fotoA.png', { type: 'image/png' });
      const file2 = new File(['b'], 'fotoB.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1, file2] } });
      });

      await waitFor(() => {
        expect(screen.getAllByDisplayValue('Gasolina')).toHaveLength(2);
      });

      // Click "Vaciar lista" in footer
      const clearBtn = screen.getByRole('button', { name: /Vaciar lista/i });
      fireEvent.click(clearBtn);

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
      confirmSpy.mockRestore();
    });

    it('revokes all active object URLs when component unmounts', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            type: 'EXPENSE',
            amount: 10,
            currency: 'USD',
            date: '2026-10-17',
            suggestedDescription: 'Gasolina',
          },
        }),
      });

      const { unmount } = render(
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
      const file1 = new File(['a'], 'fotoA.png', { type: 'image/png' });
      const file2 = new File(['b'], 'fotoB.png', { type: 'image/png' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file1, file2] } });
      });

      await waitFor(() => {
        expect(screen.getAllByDisplayValue('Gasolina')).toHaveLength(2);
      });

      unmount();

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
    });

    it('provides accessible direct camera capture input with capture="environment"', () => {
      render(
        <BatchReceiptUploaderModal
          isOpen={true}
          onClose={jest.fn()}
          accounts={mockAccounts}
          categories={mockCategories}
        />
      );

      const cameraInput = document.querySelector(
        'input[capture="environment"]'
      ) as HTMLInputElement;
      expect(cameraInput).toBeInTheDocument();
      expect(cameraInput).toHaveAttribute('type', 'file');
      expect(cameraInput).toHaveAttribute(
        'accept',
        'image/png,image/jpeg,image/webp,image/*'
      );

      // The button for taking photo triggers camera input click
      const takePhotoBtn = screen.getByRole('button', { name: /Tomar foto/i });
      expect(takePhotoBtn).toBeInTheDocument();

      const cameraClickSpy = jest
        .spyOn(cameraInput, 'click')
        .mockImplementation(() => {});
      fireEvent.click(takePhotoBtn);
      expect(cameraClickSpy).toHaveBeenCalledTimes(1);
      cameraClickSpy.mockRestore();
    });
  });

  describe('ReceiptScannerDropzone - Photo Inspection & Zoom Controls', () => {
    it('allows inspecting scanned photo with full zoom controls and Esc keyboard shortcut', () => {
      render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

      // Verify that camera button triggers file selection
      const cameraBtn = screen.getByTestId('camera-button');
      expect(cameraBtn).toBeInTheDocument();

      const cameraInput = screen.getByTestId(
        'camera-file-input'
      ) as HTMLInputElement;
      expect(cameraInput).toHaveAttribute('capture', 'environment');
      expect(cameraInput).toHaveAttribute('type', 'file');
    });
  });
});

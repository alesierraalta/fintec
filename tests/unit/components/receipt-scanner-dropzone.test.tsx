import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReceiptScannerDropzone } from '@/components/receipts/receipt-scanner-dropzone';

const mockToast = {
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
};

jest.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToast.error(...args),
    info: (...args: any[]) => mockToast.info(...args),
    success: (...args: any[]) => mockToast.success(...args),
  },
}));

// Mock the hook to test the component behavior and accessibility
const mockScanFile = jest.fn();
const mockReset = jest.fn();
let mockHookState = {
  isScanning: false,
  error: null as string | null,
  scannedResult: null as any,
  previewUrl: null as string | null,
  scanFile: mockScanFile,
  reset: mockReset,
};

jest.mock('@/hooks/use-receipt-scanner', () => ({
  useReceiptScanner: () => mockHookState,
}));

describe('ReceiptScannerDropzone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookState = {
      isScanning: false,
      error: null,
      scannedResult: null,
      previewUrl: null,
      scanFile: mockScanFile,
      reset: mockReset,
    };
  });

  it('renders idle dropzone with an accessible label linked to file input', () => {
    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const label = screen
      .getByText('Subir captura de comprobante')
      .closest('label');
    expect(label).toBeInTheDocument();

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('sr-only');
    expect(input).not.toHaveClass('hidden');

    // CRITICAL: capture attribute must NOT be present (causes desktop browser file picker to fail silently)
    expect(input).not.toHaveAttribute('capture');

    // Label htmlFor must match input id
    const inputId = input.getAttribute('id');
    expect(inputId).toBeTruthy();
    expect(label).toHaveAttribute('for', inputId);
  });

  it('triggers scanFile when a file is selected through the input', () => {
    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['dummy-content'], 'receipt.png', {
      type: 'image/png',
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockScanFile).toHaveBeenCalledWith(file);
  });

  it('renders scanning state with animation when isScanning is true', () => {
    mockHookState.isScanning = true;
    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    expect(screen.getByText(/Analizando comprobante/i)).toBeInTheDocument();
  });

  it('renders scanned result and calls reset on dismiss', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 50,
      currency: 'USD',
      bankOrPlatform: 'Banesco',
      referenceId: '123456',
      confidence: 0.95,
      suggestedAccount: {
        id: 'acc-1',
        name: 'Cuenta Banesco',
        currencyCode: 'USD',
        type: 'BANK',
      },
      accountMatchReason: 'Coincidencia con Banesco',
      accountMatchConfidence: 'HIGH',
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    expect(screen.getByText('50 USD')).toBeInTheDocument();
    expect(screen.getByText('Banesco')).toBeInTheDocument();
    expect(screen.getByText('• Ref: 123456')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', {
      name: /Quitar comprobante/i,
    });
    fireEvent.click(closeBtn);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('renders detected line items when scannedResult contains items', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 7,
      currency: 'USD',
      confidence: 0.95,
      items: [
        {
          description: 'Harina PAN',
          quantity: 2,
          unitPrice: 1.5,
          totalPrice: 3,
        },
        { description: 'Queso Blanco', quantity: 1, totalPrice: 4 },
      ],
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    expect(screen.getByTestId('detected-line-items')).toBeInTheDocument();
    expect(screen.getByText(/2 artículos detectados/i)).toBeInTheDocument();
    expect(screen.getByText(/Harina PAN/i)).toBeInTheDocument();
    expect(screen.getByText(/Queso Blanco/i)).toBeInTheDocument();
  });

  it('renders line items with null or undefined totalPrice without crashing', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 15,
      currency: 'USD',
      confidence: 0.95,
      items: [
        { description: 'Item with null price', quantity: 1, totalPrice: null },
        {
          description: 'Item with undefined price',
          quantity: null,
          totalPrice: undefined,
        },
      ],
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    expect(screen.getByTestId('detected-line-items')).toBeInTheDocument();
    expect(screen.getByText(/2 artículos detectados/i)).toBeInTheDocument();
    expect(screen.getByText(/Item with null price/i)).toBeInTheDocument();
    expect(screen.getByText(/Item with undefined price/i)).toBeInTheDocument();
  });

  it('renders direct camera input with capture="environment" and triggers it on camera button click', () => {
    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const cameraInput = screen.getByTestId(
      'camera-file-input'
    ) as HTMLInputElement;
    expect(cameraInput).toBeInTheDocument();
    expect(cameraInput).toHaveAttribute('capture', 'environment');
    expect(cameraInput).toHaveAttribute('type', 'file');

    const clickSpy = jest.spyOn(cameraInput, 'click');
    const cameraBtn = screen.getByTestId('camera-button');
    fireEvent.click(cameraBtn);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('reads clipboard image and processes file when clipboard button is clicked', async () => {
    const fakeBlob = new Blob(['image-content'], { type: 'image/png' });
    const mockClipboardItem = {
      types: ['image/png'],
      getType: jest.fn().mockResolvedValue(fakeBlob),
    };

    Object.assign(navigator, {
      clipboard: {
        read: jest.fn().mockResolvedValue([mockClipboardItem]),
      },
    });

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const clipBtn = screen.getByTestId('clipboard-button');
    fireEvent.click(clipBtn);

    await waitFor(() => {
      expect(mockScanFile).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image/png',
        })
      );
    });
  });

  it('shows error toast when clipboard contains no images', async () => {
    const mockClipboardItem = {
      types: ['text/plain'],
      getType: jest.fn(),
    };

    Object.assign(navigator, {
      clipboard: {
        read: jest.fn().mockResolvedValue([mockClipboardItem]),
      },
    });

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const clipBtn = screen.getByTestId('clipboard-button');
    fireEvent.click(clipBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'No se encontró ninguna imagen en el portapapeles'
      );
    });
  });

  it('opens lightbox preview modal when thumbnail is clicked, allows zoom in/out/reset, and closes', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 45,
      currency: 'USD',
      referenceId: 'REF-789',
    };
    mockHookState.previewUrl = 'blob:http://localhost/mock-receipt.jpg';

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const thumbnail = screen.getByTestId('receipt-thumbnail-preview');
    expect(thumbnail).toBeInTheDocument();

    // Open lightbox
    fireEvent.click(thumbnail);

    const modal = screen.getByTestId('receipt-lightbox-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Ref: #REF-789')).toBeInTheDocument();

    const zoomInBtn = screen.getByRole('button', { name: /Acercar zoom/i });
    const zoomOutBtn = screen.getByRole('button', { name: /Alejar zoom/i });
    const resetZoomBtn = screen.getByRole('button', {
      name: /Restablecer zoom/i,
    });
    const closeBtn = screen.getByRole('button', {
      name: /Cerrar vista previa/i,
    });

    // Test zoom controls
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(resetZoomBtn);

    // Close modal via close button
    fireEvent.click(closeBtn);
    expect(
      screen.queryByTestId('receipt-lightbox-modal')
    ).not.toBeInTheDocument();

    // Reopen and test close via Escape key
    fireEvent.click(thumbnail);
    expect(screen.getByTestId('receipt-lightbox-modal')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByTestId('receipt-lightbox-modal')
    ).not.toBeInTheDocument();
  });

  it('calls onReset callback when receipt is dismissed', () => {
    const onResetMock = jest.fn();
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 10,
      currency: 'USD',
    };

    render(
      <ReceiptScannerDropzone onScanSuccess={jest.fn()} onReset={onResetMock} />
    );

    const closeBtn = screen.getByRole('button', {
      name: /Quitar comprobante/i,
    });
    fireEvent.click(closeBtn);

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it('renders suggested category badge when category is detected', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 45.5,
      currency: 'USD',
      suggestedCategoryName: 'Alimentación',
      categoryMatchReason: 'Coincidencia canasta básica',
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const categoryBadge = screen.getByTestId('detected-category-badge');
    expect(categoryBadge).toBeInTheDocument();
    expect(categoryBadge).toHaveTextContent('Alimentación');
    expect(categoryBadge).toHaveTextContent('Coincidencia canasta básica');
  });

  it('does NOT render suggested category badge when transaction is a TRANSFER', () => {
    mockHookState.scannedResult = {
      type: 'TRANSFER',
      amount: 100,
      currency: 'VES',
      suggestedCategoryName: 'Alimentación', // Even if provided somehow
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    expect(
      screen.queryByTestId('detected-category-badge')
    ).not.toBeInTheDocument();
  });

  it('does NOT render suggested category badge when expectedType is TRANSFER', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 100,
      currency: 'VES',
      suggestedCategoryName: 'Alimentación',
    };

    render(
      <ReceiptScannerDropzone
        expectedType="TRANSFER"
        onScanSuccess={jest.fn()}
      />
    );

    expect(
      screen.queryByTestId('detected-category-badge')
    ).not.toBeInTheDocument();
  });

  it('renders Transferencia badge when expectedType is TRANSFER and scanned type is EXPENSE', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 21.17,
      currency: 'VES',
      suggestedCategoryName: 'Alimentación',
    };

    render(
      <ReceiptScannerDropzone
        expectedType="TRANSFER"
        onScanSuccess={jest.fn()}
      />
    );

    expect(screen.getByText('Transferencia')).toBeInTheDocument();
    expect(screen.queryByText('Gasto')).not.toBeInTheDocument();
  });

  it('renders fiscal invoice breakdown badge with subtotal, IVA, and IGTF', () => {
    mockHookState.scannedResult = {
      type: 'EXPENSE',
      amount: 119.0,
      currency: 'USD',
      invoiceNumber: '00045892',
      taxId: 'J-31415926-0',
      subtotal: 100.0,
      taxAmount: 16.0,
      taxRate: 16,
      igtfAmount: 3.0,
    };

    render(<ReceiptScannerDropzone onScanSuccess={jest.fn()} />);

    const fiscalBadge = screen.getByTestId('detected-fiscal-badge');
    expect(fiscalBadge).toBeInTheDocument();
    expect(fiscalBadge).toHaveTextContent('Factura Fiscal N° 00045892');
    expect(fiscalBadge).toHaveTextContent('RIF: J-31415926-0');
    expect(fiscalBadge).toHaveTextContent('Subtotal: 100.00 USD');
    expect(fiscalBadge).toHaveTextContent('IVA (16%): 16.00 USD');
    expect(fiscalBadge).toHaveTextContent('IGTF: 3.00 USD');
  });
});

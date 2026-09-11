import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReceiptScannerDropzone } from '@/components/receipts/receipt-scanner-dropzone';

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

    expect(screen.getByText(/Analizando captura con IA/i)).toBeInTheDocument();
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
});

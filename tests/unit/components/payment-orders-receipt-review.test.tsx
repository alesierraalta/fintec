import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReceiptUpload } from '@/components/payment-orders/receipt-upload';
import { AdminPanel } from '@/components/payment-orders/admin-panel';
import type { PaymentOrderWithDetails } from '@/types/payment-order';

// Mock Supabase
const mockGetSession = jest.fn();
jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

describe('Payment Orders - Receipt Upload & Photo Review Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-access-token-123',
          user: { id: 'admin-user-1' },
        },
      },
    });
  });

  describe('ReceiptUpload Component', () => {
    it('rejects unsupported file formats and displays error message', () => {
      render(<ReceiptUpload orderId="order-123" onSuccess={jest.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const invalidFile = new File(['executable content'], 'virus.exe', {
        type: 'application/x-msdownload',
      });

      fireEvent.change(input, { target: { files: [invalidFile] } });

      expect(
        screen.getByText(
          /Tipo de archivo no válido\. Solo se permiten imágenes/i
        )
      ).toBeInTheDocument();
    });

    it('rejects files larger than 10MB', () => {
      render(<ReceiptUpload orderId="order-123" onSuccess={jest.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const bigFile = new File(['big content'], 'large-photo.jpg', {
        type: 'image/jpeg',
      });
      Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

      fireEvent.change(input, { target: { files: [bigFile] } });

      expect(
        screen.getByText(/El archivo excede el tamaño máximo de 10MB/i)
      ).toBeInTheDocument();
    });

    it('generates image preview when a valid image receipt is selected', async () => {
      // Mock FileReader
      const mockResult = 'data:image/png;base64,mockpreviewdata';
      const originalFileReader = global.FileReader;
      class MockFileReader {
        result: string = '';
        onloadend: () => void = () => {};
        readAsDataURL() {
          this.result = mockResult;
          this.onloadend();
        }
      }
      global.FileReader = MockFileReader as any;

      render(<ReceiptUpload orderId="order-123" onSuccess={jest.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const imageFile = new File(['content'], 'pago-movil.png', {
        type: 'image/png',
      });

      fireEvent.change(input, { target: { files: [imageFile] } });

      const img = screen.getByAltText('Preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', mockResult);

      global.FileReader = originalFileReader;
    });

    it('clears selected file and preview when close button is clicked', () => {
      render(<ReceiptUpload orderId="order-123" onSuccess={jest.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['content'], 'recibo.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText('recibo.pdf')).toBeInTheDocument();

      // Click remove button
      const removeBtn = screen.getByRole('button', { name: '' });
      fireEvent.click(removeBtn);

      expect(screen.queryByText('recibo.pdf')).not.toBeInTheDocument();
    });

    it('successfully uploads receipt and triggers onSuccess after delay', async () => {
      const onSuccessMock = jest.fn();
      jest.useFakeTimers();

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          receiptUrl: 'https://cdn.example.com/receipt.jpg',
        }),
      });

      render(<ReceiptUpload orderId="order-999" onSuccess={onSuccessMock} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['img'], 'comprobante.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      const uploadBtn = screen.getByRole('button', {
        name: /Subir Comprobante/i,
      });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(screen.getByText('Comprobante Subido')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/payment-orders/order-999/receipt',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-access-token-123',
          }),
        })
      );

      jest.advanceTimersByTime(1600);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('displays error message when server returns an upload error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Orden no encontrada o cancelada',
        }),
      });

      render(<ReceiptUpload orderId="order-fail" onSuccess={jest.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(['img'], 'comprobante.jpg', { type: 'image/jpeg' });
      fireEvent.change(input, { target: { files: [file] } });

      const uploadBtn = screen.getByRole('button', {
        name: /Subir Comprobante/i,
      });
      fireEvent.click(uploadBtn);

      await waitFor(() => {
        expect(
          screen.getByText('Orden no encontrada o cancelada')
        ).toBeInTheDocument();
      });
    });
  });

  describe('AdminPanel - Photo Review Actions', () => {
    const mockOrderWithReceipt: PaymentOrderWithDetails = {
      id: 'po-101',
      userId: 'user-bob',
      amountMinor: 5000,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'PAGO_MOVIL',
      createdAt: '2026-10-15T12:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
      receiptUrl: 'https://cdn.example.com/receipts/proof-101.jpg',
      description: 'Pago de suscripción Pro',
      user: {
        email: 'bob@example.com',
      },
    };

    const mockOrderWithoutReceipt: PaymentOrderWithDetails = {
      id: 'po-102',
      userId: 'user-alice',
      amountMinor: 2500,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'BINANCE_PAY',
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
      user: {
        email: 'alice@example.com',
      },
    };

    it('renders "Ver Comprobante" button when receiptUrl exists and calls onViewReceipt callback', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockOrderWithReceipt] }),
      });
      const onViewReceiptMock = jest.fn();

      render(
        <AdminPanel
          onApprove={jest.fn()}
          onReject={jest.fn()}
          onViewReceipt={onViewReceiptMock}
        />
      );

      const viewReceiptBtn = await screen.findByRole('button', {
        name: /Ver Comprobante/i,
      });
      expect(viewReceiptBtn).toBeInTheDocument();

      fireEvent.click(viewReceiptBtn);
      expect(onViewReceiptMock).toHaveBeenCalledWith(
        'po-101',
        'https://cdn.example.com/receipts/proof-101.jpg'
      );
    });

    it('falls back to window.open when onViewReceipt callback is omitted', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockOrderWithReceipt] }),
      });
      const windowOpenSpy = jest
        .spyOn(window, 'open')
        .mockImplementation(() => null);

      render(<AdminPanel onApprove={jest.fn()} onReject={jest.fn()} />);

      const viewReceiptBtn = await screen.findByRole('button', {
        name: /Ver Comprobante/i,
      });
      fireEvent.click(viewReceiptBtn);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://cdn.example.com/receipts/proof-101.jpg',
        '_blank'
      );

      windowOpenSpy.mockRestore();
    });

    it('does not render "Ver Comprobante" button when order has no receiptUrl', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [mockOrderWithoutReceipt] }),
      });

      render(<AdminPanel onApprove={jest.fn()} onReject={jest.fn()} />);

      await screen.findByText(/PO-102/i);
      expect(
        screen.queryByRole('button', { name: /Ver Comprobante/i })
      ).not.toBeInTheDocument();
    });
  });
});

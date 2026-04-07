import { GET, PATCH } from '@/app/api/payment-orders/[id]/route';
import { POST as APPROVE } from '@/app/api/payment-orders/[id]/approve/route';
import { POST as REJECT } from '@/app/api/payment-orders/[id]/reject/route';
import { POST as UPLOAD_RECEIPT } from '@/app/api/payment-orders/[id]/receipt/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import {
  approveOrder,
  getOrderById,
  rejectOrder,
  updateOrder,
  uploadReceipt,
} from '@/lib/payment-orders/order-service';

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/payment-orders/admin-utils', () => ({
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/payment-orders/order-service', () => ({
  approveOrder: jest.fn(),
  getOrderById: jest.fn(),
  rejectOrder: jest.fn(),
  updateOrder: jest.fn(),
  uploadReceipt: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('payment order detail and action routes', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
    typeof getAuthenticatedUser
  >;
  const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
  const mockApproveOrder = approveOrder as jest.MockedFunction<
    typeof approveOrder
  >;
  const mockGetOrderById = getOrderById as jest.MockedFunction<
    typeof getOrderById
  >;
  const mockRejectOrder = rejectOrder as jest.MockedFunction<
    typeof rejectOrder
  >;
  const mockUpdateOrder = updateOrder as jest.MockedFunction<
    typeof updateOrder
  >;
  const mockUploadReceipt = uploadReceipt as jest.MockedFunction<
    typeof uploadReceipt
  >;

  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue('user-1');
    mockIsAdmin.mockReturnValue(false);
  });

  describe('GET /api/payment-orders/[id]', () => {
    it('fetches own order for regular users', async () => {
      mockGetOrderById.mockResolvedValue({ id: 'order-1' } as any);

      const response = await GET(
        new Request('http://localhost/api/payment-orders/order-1') as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetOrderById).toHaveBeenCalledWith('order-1', 'user-1');
      expect(body.data).toEqual({ id: 'order-1' });
    });

    it('fetches unscoped order for admins', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockGetOrderById.mockResolvedValue({ id: 'order-2' } as any);

      const response = await GET(
        new Request('http://localhost/api/payment-orders/order-2') as any,
        params('order-2') as any
      );

      expect(response.status).toBe(200);
      expect(mockGetOrderById).toHaveBeenCalledWith('order-2', undefined);
    });

    it('returns 404 when order is missing', async () => {
      mockGetOrderById.mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/payment-orders/missing') as any,
        params('missing') as any
      );

      expect(response.status).toBe(404);
    });

    it('returns 401 when authentication fails', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication required')
      );

      const response = await GET(
        new Request('http://localhost/api/payment-orders/order-1') as any,
        params('order-1') as any
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/payment-orders/[id]', () => {
    it('updates mutable fields', async () => {
      mockUpdateOrder.mockResolvedValue({ id: 'order-1' } as any);

      const response = await PATCH(
        new Request('http://localhost/api/payment-orders/order-1', {
          method: 'PATCH',
          body: JSON.stringify({
            description: 'Updated',
            receiptUrl: 'https://cdn/receipt.png',
            receiptFilename: 'receipt.png',
          }),
        }) as any,
        params('order-1') as any
      );

      expect(response.status).toBe(200);
      expect(mockUpdateOrder).toHaveBeenCalledWith('order-1', 'user-1', {
        description: 'Updated',
        receiptUrl: 'https://cdn/receipt.png',
        receiptFilename: 'receipt.png',
      });
    });

    it('maps not found and invalid state errors', async () => {
      mockUpdateOrder
        .mockRejectedValueOnce(new Error('order not found'))
        .mockRejectedValueOnce(
          new Error('order can only be updated while pending')
        );

      const notFound = await PATCH(
        new Request('http://localhost/api/payment-orders/order-404', {
          method: 'PATCH',
          body: JSON.stringify({ description: 'Updated' }),
        }) as any,
        params('order-404') as any
      );
      const invalidState = await PATCH(
        new Request('http://localhost/api/payment-orders/order-1', {
          method: 'PATCH',
          body: JSON.stringify({ description: 'Updated' }),
        }) as any,
        params('order-1') as any
      );

      expect(notFound.status).toBe(404);
      expect(invalidState.status).toBe(400);
    });
  });

  describe('POST /api/payment-orders/[id]/approve', () => {
    it('approves an order for admins and tolerates empty JSON body', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockApproveOrder.mockResolvedValue({ id: 'order-1' } as any);

      const response = await APPROVE(
        {
          json: jest.fn().mockRejectedValue(new Error('invalid json')),
        } as any,
        params('order-1') as any
      );

      expect(response.status).toBe(200);
      expect(mockApproveOrder).toHaveBeenCalledWith('order-1', 'user-1', {
        accountId: undefined,
        adminNotes: undefined,
      });
    });

    it('returns 401 when approval auth fails', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication required')
      );

      const response = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-1/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('blocks non-admin approvals', async () => {
      const response = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-1/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain('Admin access required');
      expect(mockApproveOrder).not.toHaveBeenCalled();
    });

    it('maps approval domain failures', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockApproveOrder
        .mockRejectedValueOnce(new Error('order not found'))
        .mockRejectedValueOnce(new Error('order must be in pending_review'))
        .mockRejectedValueOnce(new Error('order must have a receipt'));

      const notFound = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-404/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-404') as any
      );
      const badState = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-1/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-1') as any
      );
      const missingReceipt = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-1/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-1') as any
      );

      expect(notFound.status).toBe(404);
      expect(badState.status).toBe(400);
      expect(missingReceipt.status).toBe(400);
    });

    it('returns 500 for unexpected approval failures', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockApproveOrder.mockRejectedValue(new Error('approval exploded'));

      const response = await APPROVE(
        new Request('http://localhost/api/payment-orders/order-1/approve', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('approval exploded');
    });
  });

  describe('POST /api/payment-orders/[id]/reject', () => {
    it('rejects with a reason for admins', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockRejectOrder.mockResolvedValue({ id: 'order-1' } as any);

      const response = await REJECT(
        new Request('http://localhost/api/payment-orders/order-1/reject', {
          method: 'POST',
          body: JSON.stringify({
            reason: 'Receipt mismatch',
            adminNotes: 'retry',
          }),
        }) as any,
        params('order-1') as any
      );

      expect(response.status).toBe(200);
      expect(mockRejectOrder).toHaveBeenCalledWith('order-1', 'user-1', {
        reason: 'Receipt mismatch',
        adminNotes: 'retry',
      });
    });

    it('returns 401 when rejection auth fails', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication failed')
      );

      const response = await REJECT(
        new Request('http://localhost/api/payment-orders/order-1/reject', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Receipt mismatch' }),
        }) as any,
        params('order-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('rejects missing reason and non-admin access', async () => {
      mockIsAdmin.mockReturnValue(true);
      const missingReason = await REJECT(
        new Request('http://localhost/api/payment-orders/order-1/reject', {
          method: 'POST',
          body: JSON.stringify({ adminNotes: 'retry' }),
        }) as any,
        params('order-1') as any
      );
      mockIsAdmin.mockReturnValue(false);
      const forbidden = await REJECT(
        new Request('http://localhost/api/payment-orders/order-1/reject', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Nope' }),
        }) as any,
        params('order-1') as any
      );

      expect(missingReason.status).toBe(400);
      expect(forbidden.status).toBe(403);
      expect(mockRejectOrder).not.toHaveBeenCalled();
    });

    it('maps missing orders to 404', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockRejectOrder.mockRejectedValue(new Error('order not found'));

      const response = await REJECT(
        new Request('http://localhost/api/payment-orders/order-404/reject', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Receipt mismatch' }),
        }) as any,
        params('order-404') as any
      );

      expect(response.status).toBe(404);
    });

    it('returns 500 for unexpected rejection failures', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockRejectOrder.mockRejectedValue(new Error('rejection exploded'));

      const response = await REJECT(
        new Request('http://localhost/api/payment-orders/order-1/reject', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Receipt mismatch' }),
        }) as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('rejection exploded');
    });
  });

  describe('POST /api/payment-orders/[id]/receipt', () => {
    it('uploads receipt for pending orders', async () => {
      const file = new File(['receipt'], 'receipt.png', { type: 'image/png' });
      mockGetOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
      } as any);
      mockUploadReceipt.mockResolvedValue({
        url: 'https://cdn/receipt.png',
        path: 'receipts/order-1.png',
      } as any);
      mockUpdateOrder.mockResolvedValue({
        id: 'order-1',
        receiptUrl: 'https://cdn/receipt.png',
      } as any);

      const response = await UPLOAD_RECEIPT(
        {
          formData: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockReturnValue(file) }),
        } as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockUploadReceipt).toHaveBeenCalledWith('order-1', 'user-1', file);
      expect(body.data.receiptPath).toBe('receipts/order-1.png');
    });

    it('returns 401 when receipt auth fails', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication required')
      );

      const response = await UPLOAD_RECEIPT(
        {
          formData: jest.fn().mockResolvedValue({ get: jest.fn() }),
        } as any,
        params('order-1') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 404 when order is missing', async () => {
      mockGetOrderById.mockResolvedValue(null);

      const response = await UPLOAD_RECEIPT(
        {
          formData: jest.fn().mockResolvedValue({ get: jest.fn() }),
        } as any,
        params('order-404') as any
      );

      expect(response.status).toBe(404);
    });

    it('rejects non-pending orders and missing files', async () => {
      mockGetOrderById
        .mockResolvedValueOnce({ id: 'order-1', status: 'approved' } as any)
        .mockResolvedValueOnce({ id: 'order-1', status: 'pending' } as any);

      const wrongState = await UPLOAD_RECEIPT(
        {
          formData: jest.fn().mockResolvedValue({ get: jest.fn() }),
        } as any,
        params('order-1') as any
      );
      const noFile = await UPLOAD_RECEIPT(
        {
          formData: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockReturnValue(null) }),
        } as any,
        params('order-1') as any
      );

      expect(wrongState.status).toBe(400);
      expect(noFile.status).toBe(400);
    });

    it('maps receipt upload validation errors', async () => {
      const file = new File(['receipt'], 'receipt.txt', { type: 'text/plain' });
      mockGetOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
      } as any);
      mockUploadReceipt.mockRejectedValue(new Error('Invalid file type'));

      const response = await UPLOAD_RECEIPT(
        {
          formData: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockReturnValue(file) }),
        } as any,
        params('order-1') as any
      );

      expect(response.status).toBe(400);
    });

    it('returns 500 for unexpected receipt upload failures', async () => {
      const file = new File(['receipt'], 'receipt.png', { type: 'image/png' });
      mockGetOrderById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
      } as any);
      mockUploadReceipt.mockRejectedValue(new Error('receipt service down'));

      const response = await UPLOAD_RECEIPT(
        {
          formData: jest
            .fn()
            .mockResolvedValue({ get: jest.fn().mockReturnValue(file) }),
        } as any,
        params('order-1') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('receipt service down');
    });
  });
});

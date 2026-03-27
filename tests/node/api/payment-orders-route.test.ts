import { GET, POST } from '@/app/api/payment-orders/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import {
  createOrder,
  listAllOrders,
  listUserOrders,
} from '@/lib/payment-orders/order-service';

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/payment-orders/admin-utils', () => ({
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/payment-orders/order-service', () => ({
  createOrder: jest.fn(),
  listUserOrders: jest.fn(),
  listAllOrders: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('payment orders collection route', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
    typeof getAuthenticatedUser
  >;
  const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
  const mockCreateOrder = createOrder as jest.MockedFunction<
    typeof createOrder
  >;
  const mockListUserOrders = listUserOrders as jest.MockedFunction<
    typeof listUserOrders
  >;
  const mockListAllOrders = listAllOrders as jest.MockedFunction<
    typeof listAllOrders
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue('user-1');
    mockIsAdmin.mockReturnValue(false);
  });

  describe('GET /api/payment-orders', () => {
    it('lists only user orders for non-admins', async () => {
      mockListUserOrders.mockResolvedValue([{ id: 'order-1' }] as any);

      const response = await GET(
        new Request('http://localhost/api/payment-orders?status=pending') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockListUserOrders).toHaveBeenCalledWith('user-1', 'pending');
      expect(mockListAllOrders).not.toHaveBeenCalled();
      expect(body.data).toEqual([{ id: 'order-1' }]);
    });

    it('lists all orders for admins using parsed limit and offset', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockListAllOrders.mockResolvedValue([{ id: 'order-2' }] as any);

      const response = await GET(
        new Request(
          'http://localhost/api/payment-orders?status=approved&limit=10&offset=5'
        ) as any
      );

      expect(response.status).toBe(200);
      expect(mockListAllOrders).toHaveBeenCalledWith('approved', 10, 5);
    });

    it('falls back to default pagination for admins', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockListAllOrders.mockResolvedValue([] as any);

      const response = await GET(
        new Request('http://localhost/api/payment-orders') as any
      );

      expect(response.status).toBe(200);
      expect(mockListAllOrders).toHaveBeenCalledWith(undefined, 50, 0);
    });

    it('returns 401 when authentication fails', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication required')
      );

      const response = await GET(
        new Request('http://localhost/api/payment-orders') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 500 for unexpected listing failures', async () => {
      mockListUserOrders.mockRejectedValue(new Error('query failed'));

      const response = await GET(
        new Request('http://localhost/api/payment-orders') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('query failed');
    });
  });

  describe('POST /api/payment-orders', () => {
    it('creates a payment order with valid payload', async () => {
      mockCreateOrder.mockResolvedValue({ id: 'order-1' } as any);

      const response = await POST(
        new Request('http://localhost/api/payment-orders', {
          method: 'POST',
          body: JSON.stringify({
            amountMinor: 5000,
            currencyCode: 'USD',
            description: 'Top up',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(mockCreateOrder).toHaveBeenCalledWith('user-1', {
        amountMinor: 5000,
        currencyCode: 'USD',
        description: 'Top up',
      });
      expect(body.message).toBe('Order created successfully');
    });

    it('passes through missing optional fields', async () => {
      mockCreateOrder.mockResolvedValue({ id: 'order-2' } as any);

      const response = await POST(
        new Request('http://localhost/api/payment-orders', {
          method: 'POST',
          body: JSON.stringify({ amountMinor: 1000 }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(mockCreateOrder).toHaveBeenCalledWith('user-1', {
        amountMinor: 1000,
        currencyCode: undefined,
        description: undefined,
      });
    });

    it('returns 400 when amountMinor is missing', async () => {
      const response = await POST(
        new Request('http://localhost/api/payment-orders', {
          method: 'POST',
          body: JSON.stringify({ amountMinor: 0 }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        'amountMinor is required and must be greater than 0'
      );
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    it('returns 401 when auth fails during creation', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(
        new Error('Authentication failed')
      );

      const response = await POST(
        new Request('http://localhost/api/payment-orders', {
          method: 'POST',
          body: JSON.stringify({ amountMinor: 1000 }),
        }) as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 500 when order creation crashes', async () => {
      mockCreateOrder.mockRejectedValue(new Error('service unavailable'));

      const response = await POST(
        new Request('http://localhost/api/payment-orders', {
          method: 'POST',
          body: JSON.stringify({ amountMinor: 1000 }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('service unavailable');
    });
  });
});

import { GET, POST } from '@/app/api/orders/route';
import { GET as GET_BY_ID } from '@/app/api/orders/[id]/route';
import { POST as RECONCILE } from '@/app/api/orders/[id]/reconcile/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  createOrder,
  getOrderById,
  listUserOrders,
  reconcileOrderAsPaid,
} from '@/lib/orders/order-service';

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/orders/order-service', () => ({
  createOrder: jest.fn(),
  getOrderById: jest.fn(),
  listUserOrders: jest.fn(),
  reconcileOrderAsPaid: jest.fn(),
  validateExactAmount: (amount: string) => {
    if (amount !== amount.trim()) {
      throw new Error('amount must not contain leading or trailing spaces');
    }
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('orders route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUser as jest.Mock).mockResolvedValue('user-1');
  });

  it('lists the authenticated user orders', async () => {
    (listUserOrders as jest.Mock).mockResolvedValue([{ id: 'order-1' }]);

    const response = await GET(
      new Request('http://localhost/api/orders?status=pending') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listUserOrders).toHaveBeenCalledWith('user-1', 'pending');
    expect(body.data).toEqual([{ id: 'order-1' }]);
  });

  it('creates an order keeping the exact amount string', async () => {
    (createOrder as jest.Mock).mockResolvedValue({
      id: 'order-1',
      amount: '18.75',
      status: 'pending',
    });

    const response = await POST(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          serviceName: 'Spotify',
          amount: '18.75',
          senderReference: 'BIN-123',
        }),
      }) as any
    );

    expect(response.status).toBe(201);
    expect(createOrder).toHaveBeenCalledWith('user-1', {
      serviceName: 'Spotify',
      amount: '18.75',
      senderReference: 'BIN-123',
    });
  });

  it('rejects invalid amount payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          serviceName: 'Spotify',
          amount: ' 18.75',
          senderReference: 'BIN-123',
        }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      'amount must not contain leading or trailing spaces'
    );
  });

  it('fetches a single owner-scoped order', async () => {
    (getOrderById as jest.Mock).mockResolvedValue({ id: 'order-7' });

    const response = await GET_BY_ID(
      new Request('http://localhost/api/orders/order-7') as any,
      { params: Promise.resolve({ id: 'order-7' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getOrderById).toHaveBeenCalledWith('order-7', 'user-1');
    expect(body.data).toEqual({ id: 'order-7' });
  });

  it('returns 404 when a single order is missing', async () => {
    (getOrderById as jest.Mock).mockResolvedValue(null);

    const response = await GET_BY_ID(
      new Request('http://localhost/api/orders/missing') as any,
      { params: Promise.resolve({ id: 'missing' }) } as any
    );

    expect(response.status).toBe(404);
  });

  it('denies cross-user access by returning 404 for non-owned orders', async () => {
    (getOrderById as jest.Mock).mockResolvedValue(null);

    const response = await GET_BY_ID(
      new Request(
        'http://localhost/api/orders/order-owned-by-someone-else'
      ) as any,
      { params: Promise.resolve({ id: 'order-owned-by-someone-else' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(getOrderById).toHaveBeenCalledWith(
      'order-owned-by-someone-else',
      'user-1'
    );
    expect(body.error).toBe('Order not found');
  });

  it('rejects reconciliation without the shared secret', async () => {
    process.env.ORDER_RECONCILIATION_SECRET = 'secret-123';

    const response = await RECONCILE(
      new Request('http://localhost/api/orders/order-9', {
        method: 'POST',
      }) as any,
      { params: Promise.resolve({ id: 'order-9' }) } as any
    );

    expect(response.status).toBe(401);
    expect(reconcileOrderAsPaid).not.toHaveBeenCalled();
  });

  it('allows trusted reconciliation to mark an order as paid', async () => {
    process.env.ORDER_RECONCILIATION_SECRET = 'secret-123';
    (reconcileOrderAsPaid as jest.Mock).mockResolvedValue({
      id: 'order-9',
      status: 'paid',
    });

    const response = await RECONCILE(
      new Request('http://localhost/api/orders/order-9', {
        method: 'POST',
        headers: {
          'x-order-reconciliation-secret': 'secret-123',
        },
      }) as any,
      { params: Promise.resolve({ id: 'order-9' }) } as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reconcileOrderAsPaid).toHaveBeenCalledWith('order-9');
    expect(body.data).toEqual({ id: 'order-9', status: 'paid' });
  });
});

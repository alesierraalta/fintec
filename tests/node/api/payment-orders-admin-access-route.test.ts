import { GET } from '@/app/api/payment-orders/admin/access/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/payment-orders/admin-utils', () => ({
  isAdmin: jest.fn(),
}));

describe('GET /api/payment-orders/admin/access', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
    typeof getAuthenticatedUser
  >;
  const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns admin access for authenticated admin users', async () => {
    mockGetAuthenticatedUser.mockResolvedValue('admin-user-id');
    mockIsAdmin.mockReturnValue(true);

    const response = await GET(
      new Request('http://localhost/api/payment-orders/admin/access') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        isAdmin: true,
      },
    });
    expect(mockIsAdmin).toHaveBeenCalledWith('admin-user-id');
  });

  it('returns false for authenticated non-admin users', async () => {
    mockGetAuthenticatedUser.mockResolvedValue('regular-user-id');
    mockIsAdmin.mockReturnValue(false);

    const response = await GET(
      new Request('http://localhost/api/payment-orders/admin/access') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        isAdmin: false,
      },
    });
    expect(mockIsAdmin).toHaveBeenCalledWith('regular-user-id');
  });

  it('returns 401 when authentication fails', async () => {
    mockGetAuthenticatedUser.mockRejectedValue(
      new Error('No authorization token provided')
    );

    const response = await GET(
      new Request('http://localhost/api/payment-orders/admin/access') as any
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });
});

import { getAdminAccess, requireAdmin } from '@/lib/admin/guard';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { AppError } from '@/lib/errors/app-error';

jest.mock('@/lib/auth/get-authenticated-user', () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock('@/lib/payment-orders/admin-utils', () => ({ isAdmin: jest.fn() }));

describe('admin guard', () => {
  const auth = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
  const admin = isAdmin as jest.MockedFunction<typeof isAdmin>;

  beforeEach(() => jest.clearAllMocks());

  it('authenticates before checking the admin policy', async () => {
    auth.mockResolvedValue('admin-id');
    admin.mockReturnValue(true);
    await expect(getAdminAccess()).resolves.toEqual({ userId: 'admin-id', isAdmin: true });
    expect(auth.mock.invocationCallOrder[0]).toBeLessThan(admin.mock.invocationCallOrder[0]);
  });

  it('propagates authentication failures', async () => {
    const error = new Error('Authentication failed');
    auth.mockRejectedValue(error);
    await expect(requireAdmin()).rejects.toBe(error);
    expect(admin).not.toHaveBeenCalled();
  });

  it('throws a forbidden AppError for non-admin users', async () => {
    auth.mockResolvedValue('user-id');
    admin.mockReturnValue(false);
    await expect(requireAdmin()).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    await expect(requireAdmin()).rejects.toBeInstanceOf(AppError);
  });

  it('accepts an administrator', async () => {
    auth.mockResolvedValue('admin-id');
    admin.mockReturnValue(true);
    await expect(requireAdmin()).resolves.toBe('admin-id');
  });
});

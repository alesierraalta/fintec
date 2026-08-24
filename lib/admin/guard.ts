import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { AppError } from '@/lib/errors/app-error';

export async function getAdminAccess(): Promise<{ userId: string; isAdmin: boolean }> {
  const userId = await getAuthenticatedUser();
  return { userId, isAdmin: isAdmin(userId) };
}

export async function requireAdmin(): Promise<string> {
  const { userId, isAdmin: authorized } = await getAdminAccess();
  if (!authorized) {
    throw new AppError('Admin access required', 'FORBIDDEN', 403);
  }
  return userId;
}

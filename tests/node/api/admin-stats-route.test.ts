import { GET } from '@/app/api/admin/stats/route';
import { requireAdmin } from '@/lib/admin/guard';
import { getAdminStats } from '@/lib/admin-stats/service';
import { AppError } from '@/lib/errors/app-error';

jest.mock('@/lib/admin/guard', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/admin-stats/service', () => ({ getAdminStats: jest.fn() }));
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn() } }));

describe('GET /api/admin/stats', () => {
  const guard = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
  const stats = getAdminStats as jest.MockedFunction<typeof getAdminStats>;
  beforeEach(() => {
    jest.clearAllMocks();
    guard.mockResolvedValue('admin-id');
    stats.mockResolvedValue({
      featureUsage: {
        status: 'empty',
        window: '30d',
        items: [],
        monthlyCounters: {
          status: 'empty',
          source: 'usage_tracking',
          basis: 'month_based',
          items: [],
        },
      },
    } as any);
  });
  const request = (url = 'http://localhost/api/admin/stats') =>
    new Request(url) as any;

  it('returns the default aggregate and no-store header', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.data.featureUsage.status).toBeDefined();
    expect(body.data.featureUsage.window).toBeDefined();
    expect(Array.isArray(body.data.featureUsage.items)).toBe(true);
    expect(body.data.featureUsage.monthlyCounters).toBeDefined();
    expect(stats).toHaveBeenCalledWith('30d');
  });

  it.each(['7d', '30d', '90d'])('supports %s', async (window) => {
    await GET(request(`http://localhost/api/admin/stats?window=${window}`));
    expect(stats).toHaveBeenCalledWith(window);
  });

  it('rejects unsupported windows without calling the service', async () => {
    const response = await GET(
      request('http://localhost/api/admin/stats?window=365d')
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(stats).not.toHaveBeenCalled();
  });

  it('returns forbidden without calling the service', async () => {
    guard.mockRejectedValue(
      new AppError('Admin access required', 'FORBIDDEN', 403)
    );
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(stats).not.toHaveBeenCalled();
  });

  it('returns safe internal errors', async () => {
    stats.mockRejectedValue(new Error('database secret details'));
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.data).toBeNull();
    expect(body.error).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(body.error.message).not.toContain('database secret');
  });
});

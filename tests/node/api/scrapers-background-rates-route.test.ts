import { GET as GET_HEALTH } from '@/app/api/scrapers/health/route';
import {
  GET as GET_BACKGROUND,
  POST as START_BACKGROUND,
} from '@/app/api/background-scraper/start/route';
import { POST as STOP_BACKGROUND } from '@/app/api/background-scraper/stop/route';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import BackgroundScraperManager from '@/lib/services/background-scraper-manager';
import ScraperInstanceManager from '@/lib/services/scraper-instance-manager';
import { healthMonitor } from '@/lib/scrapers/health-monitor';
import { createServer } from 'http';

jest.mock('http', () => ({
  createServer: jest.fn(),
}));

jest.mock('@/lib/auth/get-authenticated-user', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/payment-orders/admin-utils', () => ({
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/services/background-scraper-manager', () =>
  jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    getLatestRates: jest.fn().mockResolvedValue({ usd_ves: 36 }),
    stop: jest.fn().mockResolvedValue(undefined),
  }))
);

jest.mock('@/lib/services/scraper-instance-manager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/lib/scrapers/health-monitor', () => ({
  healthMonitor: {
    getAllHealthStatuses: jest.fn(),
    areAllHealthy: jest.fn(),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('scraper health and background scraper routes', () => {
  const originalUnifiedScraperFlag = process.env.BACKEND_UNIFIED_SCRAPER;
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<
    typeof getAuthenticatedUser
  >;
  const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
  const mockCreateServer = createServer as jest.MockedFunction<
    typeof createServer
  >;
  const mockBackgroundScraperManager = BackgroundScraperManager as jest.Mock;
  const mockGetInstance = ScraperInstanceManager.getInstance as jest.Mock;
  const mockHealthMonitor = healthMonitor as jest.Mocked<typeof healthMonitor>;

  let httpServer: { listen: jest.Mock; close: jest.Mock };
  let scraperManager: {
    start: jest.Mock;
    getLatestRates: jest.Mock;
    stop: jest.Mock;
  };
  let instanceManager: {
    isRunning: jest.Mock;
    setScraperManager: jest.Mock;
    getScraperManager: jest.Mock;
    getHttpServer: jest.Mock;
    clearScraperManager: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BACKEND_UNIFIED_SCRAPER;
    mockGetAuthenticatedUser.mockResolvedValue('admin-1');
    mockIsAdmin.mockReturnValue(true);
    httpServer = {
      listen: jest.fn((port, cb) => cb?.()),
      close: jest.fn(),
    };
    scraperManager = {
      start: jest.fn().mockResolvedValue(undefined),
      getLatestRates: jest.fn().mockResolvedValue({ usd_ves: 36 }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    instanceManager = {
      isRunning: jest.fn().mockReturnValue(false),
      setScraperManager: jest.fn(),
      getScraperManager: jest.fn().mockReturnValue(scraperManager),
      getHttpServer: jest.fn().mockReturnValue(httpServer),
      clearScraperManager: jest.fn(),
    };
    mockCreateServer.mockReturnValue(httpServer as any);
    mockBackgroundScraperManager.mockImplementation(
      () => scraperManager as any
    );
    mockGetInstance.mockReturnValue(instanceManager);
    mockHealthMonitor.getAllHealthStatuses.mockReturnValue(
      new Map([
        [
          'bcv',
          {
            healthy: true,
            lastSuccessTime: 1710000000000,
            lastFailureTime: null,
          },
        ],
      ]) as any
    );
    mockHealthMonitor.areAllHealthy.mockReturnValue(true);
  });

  afterAll(() => {
    if (originalUnifiedScraperFlag === undefined) {
      delete process.env.BACKEND_UNIFIED_SCRAPER;
      return;
    }

    process.env.BACKEND_UNIFIED_SCRAPER = originalUnifiedScraperFlag;
  });

  it('returns serialized scraper health', async () => {
    const response = await GET_HEALTH();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.healthy).toBe(true);
    expect(body.scraperCount).toBe(1);
    expect(body.scrapers.bcv.lastSuccessTime).toContain('T');
  });

  it('returns 500 when health monitoring crashes', async () => {
    mockHealthMonitor.getAllHealthStatuses.mockImplementation(() => {
      throw new Error('health offline');
    });

    const response = await GET_HEALTH();

    expect(response.status).toBe(500);
  });

  it('starts the background scraper for admins', async () => {
    const response = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );

    expect(response.status).toBe(200);
    expect(mockCreateServer).toHaveBeenCalled();
    expect(httpServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(instanceManager.setScraperManager).toHaveBeenCalled();
  });

  it('returns already running when singleton reports active scraper', async () => {
    instanceManager.isRunning.mockReturnValue(true);

    const response = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('already running');
    expect(mockBackgroundScraperManager).not.toHaveBeenCalled();
  });

  it('blocks startup when unified scraper rollout is disabled', async () => {
    process.env.BACKEND_UNIFIED_SCRAPER = 'false';

    const response = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('BACKEND_UNIFIED_SCRAPER');
    expect(mockCreateServer).not.toHaveBeenCalled();
    expect(mockBackgroundScraperManager).not.toHaveBeenCalled();
  });

  it('blocks non-admin startup and maps auth failures to 401', async () => {
    mockIsAdmin.mockReturnValueOnce(false);
    mockGetAuthenticatedUser
      .mockResolvedValueOnce('admin-1')
      .mockRejectedValueOnce(new Error('No authorization token provided'));

    const forbidden = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );
    const unauthorized = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );

    expect(forbidden.status).toBe(403);
    expect(unauthorized.status).toBe(401);
  });

  it('returns 500 when background scraper startup crashes', async () => {
    scraperManager.start.mockRejectedValue(new Error('startup exploded'));

    const response = await START_BACKGROUND(
      new Request('http://localhost/api/background-scraper/start', {
        method: 'POST',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('startup exploded');
  });

  it('returns latest background scraper rates when initialized', async () => {
    const response = await GET_BACKGROUND();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ usd_ves: 36 });
  });

  it('returns uninitialized and failure responses for background scraper GET', async () => {
    instanceManager.getScraperManager.mockReturnValueOnce(null);
    scraperManager.getLatestRates.mockRejectedValueOnce(
      new Error('fetch failed')
    );

    const uninitialized = await GET_BACKGROUND();
    const failure = await GET_BACKGROUND();

    expect(uninitialized.status).toBe(200);
    expect((await uninitialized.json()).message).toContain('not initialized');
    expect(failure.status).toBe(500);
  });

  it('stops background scraper and clears singleton state', async () => {
    const response = await STOP_BACKGROUND(
      new Request('http://localhost/api/background-scraper/stop', {
        method: 'POST',
      }) as any
    );

    expect(response.status).toBe(200);
    expect(scraperManager.stop).toHaveBeenCalled();
    expect(httpServer.close).toHaveBeenCalled();
    expect(instanceManager.clearScraperManager).toHaveBeenCalled();
  });

  it('returns 500 when background scraper stop crashes', async () => {
    scraperManager.stop.mockRejectedValue(new Error('stop exploded'));

    const response = await STOP_BACKGROUND(
      new Request('http://localhost/api/background-scraper/stop', {
        method: 'POST',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('stop exploded');
  });

  it('returns not running, forbidden, and unauthorized for stop route', async () => {
    instanceManager.getScraperManager.mockReturnValueOnce(null);
    mockIsAdmin.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockGetAuthenticatedUser
      .mockResolvedValueOnce('admin-1')
      .mockResolvedValueOnce('admin-1')
      .mockRejectedValueOnce(new Error('Authentication failed'));

    const notRunning = await STOP_BACKGROUND(
      new Request('http://localhost/api/background-scraper/stop', {
        method: 'POST',
      }) as any
    );
    const forbidden = await STOP_BACKGROUND(
      new Request('http://localhost/api/background-scraper/stop', {
        method: 'POST',
      }) as any
    );
    const unauthorized = await STOP_BACKGROUND(
      new Request('http://localhost/api/background-scraper/stop', {
        method: 'POST',
      }) as any
    );

    expect(notRunning.status).toBe(200);
    expect((await notRunning.json()).message).toContain('not running');
    expect(forbidden.status).toBe(403);
    expect(unauthorized.status).toBe(401);
  });
});

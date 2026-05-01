import BackgroundScraperManager from '@/lib/services/background-scraper-manager';
import BackgroundScraperService from '@/lib/services/background-scraper';
import ExchangeRateDatabase from '@/lib/services/exchange-rate-db';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import { healthMonitor } from '@/lib/scrapers/health-monitor';
import { Server as SocketIOServer } from 'socket.io';

const mockSocketServer = {
  close: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
};

const mockScraperInstance = {
  start: jest.fn(),
  stop: jest.fn(),
};

const mockExchangeRateDatabase = {
  getExchangeRateHistory: jest.fn(),
  getLatestExchangeRate: jest.fn(),
  storeExchangeRate: jest.fn(),
};

const mockRatesHistoryRepository = {
  upsertBinanceRate: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockSocketServer),
}));

jest.mock('@/lib/services/background-scraper', () =>
  jest.fn(() => mockScraperInstance)
);

jest.mock('@/lib/services/exchange-rate-db', () =>
  jest.fn(() => mockExchangeRateDatabase)
);

jest.mock('@/repositories/supabase/rates-history-repository-impl', () => ({
  SupabaseRatesHistoryRepository: jest.fn(() => mockRatesHistoryRepository),
}));

jest.mock('@/lib/scrapers/health-monitor', () => ({
  healthMonitor: {
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('BackgroundScraperManager', () => {
  const originalUnifiedScraperFlag = process.env.BACKEND_UNIFIED_SCRAPER;
  const mockBackgroundScraperService =
    BackgroundScraperService as jest.MockedClass<
      typeof BackgroundScraperService
    >;
  const mockSocketIoServer = SocketIOServer as jest.MockedClass<
    typeof SocketIOServer
  >;
  const mockExchangeRateDbClass = ExchangeRateDatabase as jest.MockedClass<
    typeof ExchangeRateDatabase
  >;
  const mockRatesHistoryRepoClass =
    SupabaseRatesHistoryRepository as jest.MockedClass<
      typeof SupabaseRatesHistoryRepository
    >;
  const mockHealthMonitor = healthMonitor as jest.Mocked<typeof healthMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BACKEND_UNIFIED_SCRAPER;
    mockScraperInstance.start.mockImplementation(() => undefined);
    mockScraperInstance.stop.mockImplementation(() => undefined);
    mockExchangeRateDatabase.storeExchangeRate.mockResolvedValue(true);
    mockExchangeRateDatabase.getLatestExchangeRate.mockResolvedValue(null);
    mockExchangeRateDatabase.getExchangeRateHistory.mockResolvedValue([]);
    mockRatesHistoryRepository.upsertBinanceRate.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalUnifiedScraperFlag === undefined) {
      delete process.env.BACKEND_UNIFIED_SCRAPER;
      return;
    }

    process.env.BACKEND_UNIFIED_SCRAPER = originalUnifiedScraperFlag;
  });

  it('uses a single scraper loop and reuses its payload for persistence and websocket broadcast', async () => {
    let onUpdate: ((data: any) => void) | undefined;
    mockScraperInstance.start.mockImplementation(
      (callback: (data: any) => void) => {
        onUpdate = callback;
      }
    );

    const manager = new BackgroundScraperManager({} as any);

    await manager.start();

    expect(mockBackgroundScraperService).toHaveBeenCalledTimes(1);
    expect(mockSocketIoServer).toHaveBeenCalledTimes(1);
    expect(mockExchangeRateDbClass).toHaveBeenCalledTimes(1);
    expect(mockRatesHistoryRepoClass).toHaveBeenCalledTimes(1);

    onUpdate?.({
      success: true,
      binance: {
        success: true,
        data: {
          usd_ves: 36.5,
          usdt_ves: 37.1,
          sell_rate: 37.2,
          buy_rate: 36.9,
          lastUpdated: '2026-04-08T22:00:00.000Z',
          source: 'Binance',
        },
      },
      bcv: {
        success: true,
        data: {
          usd: 36.4,
          eur: 39.5,
          source: 'BCV',
        },
      },
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockExchangeRateDatabase.storeExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({
        usd_ves: 36.4, // Prefer BCV
        usdt_ves: 37.1,
        sell_rate: 37.2,
        buy_rate: 36.9,
      })
    );
    expect(mockRatesHistoryRepository.upsertBinanceRate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'Binance',
        usd: 37.1,
      })
    );
    expect(mockSocketServer.emit).toHaveBeenCalledWith(
      'exchange-rate-update',
      expect.objectContaining({
        usd_ves: 36.4,
        usdt_ves: 37.1,
        sell_rate: 37.2,
        buy_rate: 36.9,
      })
    );
    expect(mockHealthMonitor.recordSuccess).toHaveBeenCalledTimes(1);
  });

  it('stops the single scraper loop and closes websocket resources', async () => {
    const manager = new BackgroundScraperManager({} as any);

    await manager.start();
    await manager.stop();

    expect(mockScraperInstance.stop).toHaveBeenCalledTimes(1);
    expect(mockSocketServer.close).toHaveBeenCalledTimes(1);
  });

  it('does not start websocket or scraper when unified scraper kill switch is off', async () => {
    process.env.BACKEND_UNIFIED_SCRAPER = 'false';

    const manager = new BackgroundScraperManager({} as any);

    await manager.start();

    expect(mockScraperInstance.start).not.toHaveBeenCalled();
    expect(mockSocketServer.emit).not.toHaveBeenCalled();
  });
});

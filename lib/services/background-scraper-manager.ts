import { Server as HTTPServer } from 'http';
import BackgroundScraperService from './background-scraper';
import WebSocketService from './websocket-server';
import ExchangeRateDatabase from './exchange-rate-db';
import { healthMonitor } from '@/lib/scrapers/health-monitor';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';
import {
  getBackendScraperIntervalMs,
  isBackendUnifiedScraperEnabled,
} from '@/lib/backend/feature-flags';

import { logger } from '@/lib/utils/logger';
import { createServiceClient } from '@/lib/supabase/admin';

class BackgroundScraperManager {
  private httpServer: HTTPServer;
  private scraper: BackgroundScraperService;
  private websocket: WebSocketService;
  private database: ExchangeRateDatabase;
  private ratesHistoryRepo: SupabaseRatesHistoryRepository;
  private isRunning = false;

  constructor(httpServer: HTTPServer) {
    this.httpServer = httpServer;
    this.scraper = new BackgroundScraperService(getBackendScraperIntervalMs());
    this.websocket = new WebSocketService(httpServer);

    // * Use service role client for background operations to bypass RLS
    const serviceClient = createServiceClient();
    this.ratesHistoryRepo = new SupabaseRatesHistoryRepository(serviceClient);
    this.database = new ExchangeRateDatabase(this.ratesHistoryRepo);

    this.setupScraperCallbacks();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Background scraper manager already running');
      return;
    }

    if (!isBackendUnifiedScraperEnabled()) {
      logger.warn(
        'Background scraper manager start skipped because BACKEND_UNIFIED_SCRAPER is disabled'
      );
      return;
    }

    logger.info('Starting background scraper manager...');
    this.isRunning = true;

    // Start WebSocket service
    this.websocket.start();

    // Start background scraper
    this.scraper.start((data) => {
      this.handleScraperUpdate(data);
    });

    logger.info('Background scraper manager started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping background scraper manager...');
    this.isRunning = false;

    this.scraper.stop();
    this.websocket.stop();

    logger.info('Background scraper manager stopped');
  }

  private setupScraperCallbacks(): void {
    // Callbacks are handled in the start method
  }

  private async handleScraperUpdate(data: any): Promise<void> {
    const startTime = Date.now();

    // Check if we have any successful result
    const binanceData = data.binance?.data;
    const bcvData = data.bcv?.data;
    const hasSuccess =
      data.success && (data.binance?.success || data.bcv?.success);

    if (hasSuccess) {
      try {
        // Construct unified data object
        const unifiedData = {
          usd_ves: bcvData?.usd || binanceData?.usdt_ves || 0,
          usdt_ves: binanceData?.usdt_ves || bcvData?.usd || 0,
          sell_rate: binanceData?.sell_rate || 0,
          buy_rate: binanceData?.buy_rate || 0,
          lastUpdated: new Date().toISOString(),
          source: `Unified (${data.binance?.success ? 'Binance' : ''}${data.binance?.success && data.bcv?.success ? '+' : ''}${data.bcv?.success ? 'BCV' : ''})`,
        };

        // 1. Broadcast the unified snapshot via WebSocket
        // WebSocketService expects { success: true, data: { ... } }
        this.websocket.broadcastUpdate({
          success: true,
          data: unifiedData,
        });

        // 2. Store unified snapshot for immediate retrieval
        await this.database.storeExchangeRate(unifiedData);

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // 2. Save Binance rate to history if successful
        if (data.binance?.success && binanceData) {
          try {
            await this.ratesHistoryRepo.upsertBinanceRate({
              date: today,
              usd: binanceData.usdt_ves,
              source: 'Binance',
              timestamp: now,
            });
          } catch (historyError) {
            logger.warn(
              '[BackgroundScraper] Failed to save Binance rate to history:',
              historyError
            );
          }
        }

        // 3. Save BCV rate to history if successful
        if (data.bcv?.success && bcvData) {
          try {
            await this.ratesHistoryRepo.upsertBCVRate({
              date: today,
              usd: bcvData.usd,
              eur: bcvData.eur,
              source: 'BCV',
              timestamp: now,
            });
          } catch (historyError) {
            logger.warn(
              '[BackgroundScraper] Failed to save BCV rate to history:',
              historyError
            );
          }
        }

        logger.info('Unified exchange rates updated and stored in database');
        healthMonitor.recordSuccess(
          'BackgroundScraper',
          Date.now() - startTime
        );
      } catch (error) {
        healthMonitor.recordFailure(
          'BackgroundScraper',
          Date.now() - startTime
        );
        logger.error('Error handling scraper update:', error);
      }
    } else {
      healthMonitor.recordFailure('BackgroundScraper', Date.now() - startTime);
      logger.error(
        'Scraper update failed:',
        data.error || 'All scrapers failed'
      );
    }
  }

  async getLatestRates(): Promise<any> {
    return await this.database.getLatestExchangeRate();
  }

  async getRateHistory(limit: number = 100): Promise<any[]> {
    return await this.database.getExchangeRateHistory(limit);
  }
}

export default BackgroundScraperManager;

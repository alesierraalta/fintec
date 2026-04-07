import { Server as HTTPServer } from 'http';
import BackgroundScraperService from './background-scraper';
import WebSocketService from './websocket-server';
import ExchangeRateDatabase from './exchange-rate-db';
import { healthMonitor } from '@/lib/scrapers/health-monitor';
import { SupabaseRatesHistoryRepository } from '@/repositories/supabase/rates-history-repository-impl';

import { logger } from '@/lib/utils/logger';

class BackgroundScraperManager {
  private httpServer: HTTPServer;
  private scraper: BackgroundScraperService;
  private websocket: WebSocketService;
  private database: ExchangeRateDatabase;
  private ratesHistoryRepo: SupabaseRatesHistoryRepository;
  private isRunning = false;

  constructor(httpServer: HTTPServer) {
    this.httpServer = httpServer;
    this.scraper = new BackgroundScraperService(60000); // 1 minute interval
    this.websocket = new WebSocketService(httpServer);
    this.database = new ExchangeRateDatabase();
    this.ratesHistoryRepo = new SupabaseRatesHistoryRepository();

    this.setupScraperCallbacks();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('Background scraper manager already running');
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
    const responseTime = Date.now() - startTime;

    if (data.success && data.data) {
      try {
        // Lógica correcta:
        // - SELL del scraper = personas que VENDEN USDT (reciben VES) = precio de VENTA para usuario
        // - BUY del scraper = personas que COMPRAN USDT (pagan VES) = precio de COMPRA para usuario
        await this.database.storeExchangeRate({
          usd_ves: data.data.usd_ves,
          usdt_ves: data.data.usdt_ves,
          sell_rate: data.data.sell_rate, // SELL del scraper = precio de VENTA para usuario
          buy_rate: data.data.buy_rate, // BUY del scraper = precio de COMPRA para usuario
          lastUpdated: data.data.lastUpdated,
          source: data.data.source,
        });

        // Also save to rate history tables (bcv_rate_history and binance_rate_history)
        // for the historical rates feature used in transaction details
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // Save Binance rate to history
        try {
          await this.ratesHistoryRepo.upsertBinanceRate({
            date: today,
            usd: data.data.usdt_ves,
            source: 'Binance',
            timestamp: now,
          });
        } catch (historyError) {
          logger.warn(
            '[BackgroundScraper] Failed to save Binance rate to history:',
            historyError
          );
        }

        // Record success in health monitor
        healthMonitor.recordSuccess('binance-background', responseTime);

        logger.info('Exchange rate updated and stored in database');
      } catch (error) {
        // Record failure in health monitor
        healthMonitor.recordFailure('binance-background', responseTime);
        logger.error('Error handling scraper update:', error);
      }
    } else {
      // Record failure in health monitor
      healthMonitor.recordFailure('binance-background', responseTime);
      logger.error('Scraper update failed:', data.error);
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

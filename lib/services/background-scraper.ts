import { logger } from '@/lib/utils/logger';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

interface ScraperResult {
  success: boolean;
  data?: {
    usd_ves: number;
    usdt_ves: number;
    sell_rate: number;
    buy_rate: number;
    lastUpdated: string;
    source: string;
  };
  error?: string;
}

class BackgroundScraperService {
  private isRunning = false;
  private updateInterval = 60000; // 1 minute
  private onUpdateCallback?: (data: ScraperResult) => void;
  private timerId?: NodeJS.Timeout;

  constructor(updateIntervalMs: number = 60000) {
    this.updateInterval = updateIntervalMs;
  }

  start(onUpdate: (data: ScraperResult) => void): void {
    if (this.isRunning) {
      logger.info('Background scraper already running');
      return;
    }

    this.onUpdateCallback = onUpdate;
    this.isRunning = true;

    logger.info('Starting background scraper service (Native TS)...');
    this.runScraperLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    logger.info('Background scraper service stopped');
  }

  private async runScraperLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Execute the scraper directly
      const result = await scrapeBinanceRates();

      if (this.onUpdateCallback) {
        this.onUpdateCallback(result);
      }
    } catch (error) {
      logger.error('Scraper error:', error);
      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Schedule next run
    if (this.isRunning) {
      this.timerId = setTimeout(() => this.runScraperLoop(), this.updateInterval);
    }
  }
}

export default BackgroundScraperService;

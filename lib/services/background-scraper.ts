import { logger } from '@/lib/utils/logger';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';

interface ScraperResult {
  success: boolean;
  binance?: any;
  bcv?: any;
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

    logger.info('Starting background scraper service (Unified)...');
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
      // Execute both scrapers in parallel
      const [binanceResult, bcvResult] = await Promise.all([
        scrapeBinanceRates(),
        scrapeBCVRates(),
      ]);

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          success: binanceResult.success || bcvResult.success,
          binance: binanceResult,
          bcv: bcvResult,
        });
      }
    } catch (error) {
      logger.error('Scraper loop error:', error);
      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Schedule next run
    if (this.isRunning) {
      this.timerId = setTimeout(
        () => this.runScraperLoop(),
        this.updateInterval
      );
    }
  }
}

export default BackgroundScraperService;

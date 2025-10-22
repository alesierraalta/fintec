import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';

import { logger } from '@/lib/utils/logger';
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
  private worker: Worker | null = null;
  private isRunning = false;
  private updateInterval = 60000; // 1 minute
  private onUpdateCallback?: (data: ScraperResult) => void;

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
    
    logger.info('Starting background scraper service...');
    this.runScraperLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    logger.info('Background scraper service stopped');
  }

  private async runScraperLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const result = await this.runPythonScraper();
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

      // Wait before next run
      await this.sleep(this.updateInterval);
    }
  }

  private async runPythonScraper(): Promise<ScraperResult> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'scripts', 'binance_scraper_ultra_fast.py');
      
      const childProcess = spawn('python', [pythonScript, '--silent'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse scraper output: ${parseError}`));
          }
        } else {
          reject(new Error(`Python scraper failed with code ${code}: ${stderr}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python scraper: ${error.message}`));
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('Python scraper timeout'));
      }, 120000);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BackgroundScraperService;

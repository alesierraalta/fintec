import { Server as HTTPServer } from 'http';
import BackgroundScraperManager from './background-scraper-manager';

/**
 * Singleton manager for BackgroundScraper instance
 * Ensures single shared instance across API routes
 */
class ScraperInstanceManager {
  private static instance: ScraperInstanceManager | null = null;
  private scraperManager: BackgroundScraperManager | null = null;
  private httpServer: HTTPServer | null = null;

  private constructor() {}

  static getInstance(): ScraperInstanceManager {
    if (!ScraperInstanceManager.instance) {
      ScraperInstanceManager.instance = new ScraperInstanceManager();
    }
    return ScraperInstanceManager.instance;
  }

  getScraperManager(): BackgroundScraperManager | null {
    return this.scraperManager;
  }

  setScraperManager(manager: BackgroundScraperManager, server: HTTPServer): void {
    this.scraperManager = manager;
    this.httpServer = server;
  }

  clearScraperManager(): void {
    this.scraperManager = null;
    this.httpServer = null;
  }

  getHttpServer(): HTTPServer | null {
    return this.httpServer;
  }

  isRunning(): boolean {
    return this.scraperManager !== null;
  }
}

export default ScraperInstanceManager;


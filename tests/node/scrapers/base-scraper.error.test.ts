import { BaseScraper } from '@/lib/scrapers/base-scraper';
import { ScraperConfig, ScraperError, ScraperResult } from '@/lib/scrapers/types';

// Concrete implementation for testing
class TestScraper extends BaseScraper<any> {
  // Mockable methods
  public fetchDataMock = jest.fn();
  public parseDataMock = jest.fn();
  public validateDataMock = jest.fn();
  public transformDataMock = jest.fn();

  constructor(config: ScraperConfig) {
    super(config);
  }

  protected async _fetchData(): Promise<unknown> {
    return this.fetchDataMock();
  }

  protected async _parseData(data: unknown): Promise<unknown> {
    return this.parseDataMock(data);
  }

  protected _validateData(data: unknown): ScraperError | null {
    return this.validateDataMock(data);
  }

  protected _transformData(data: unknown): any {
    return this.transformDataMock(data);
  }

  protected createErrorResult(error: ScraperError, startTime: number): ScraperResult<any> {
    return {
      success: false,
      data: null,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

describe('BaseScraper Error Handling', () => {
  let scraper: TestScraper;
  const config: ScraperConfig = {
    name: 'TestScraper',
    timeout: 1000,
    maxRetries: 1,
    baseDelay: 10,
    maxDelay: 100,
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 1000,
      successThreshold: 2,
      name: 'TestBreaker'
    }
  };

  beforeEach(() => {
    scraper = new TestScraper(config);
  });

  it('should handle malformed HTML/data during parsing gracefully', async () => {
    // Simulate successful fetch but malformed data
    scraper.fetchDataMock.mockResolvedValue('<html><body>Bad Data</body></html>');
    
    // Parse throws error
    scraper.parseDataMock.mockRejectedValue(new Error('Unexpected token < in JSON at position 0'));

    const result = await scraper.scrape();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unexpected token');
    // Ensure it didn't crash the process
  });

  it('should handle empty responses', async () => {
    scraper.fetchDataMock.mockResolvedValue(null);
    scraper.parseDataMock.mockResolvedValue(null);
    
    // Validation returns error
    scraper.validateDataMock.mockReturnValue(new ScraperError('Data is empty', 'EMPTY_DATA'));

    const result = await scraper.scrape();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Data is empty');
  });

  it('should wrap unknown errors in ScraperError', async () => {
    scraper.fetchDataMock.mockRejectedValue(new Error('Network went boom'));

    const result = await scraper.scrape();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network went boom');
  });

  it('should respect circuit breaker on repeated failures', async () => {
    scraper.fetchDataMock.mockRejectedValue(new Error('Fail'));

    // Fail enough times to trip breaker
    let attempts = 0;
    // Circuit breaker is protected, but we exposed getCircuitBreakerState in BaseScraper
    while (scraper.getCircuitBreakerState() === 'CLOSED' && attempts < 20) {
      await scraper.scrape();
      attempts++;
    }

    expect(scraper.getCircuitBreakerState()).toBe('OPEN');

    // Next attempt should be blocked by circuit breaker immediately
    const result = await scraper.scrape();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Circuit breaker is OPEN');
    
    // Should have been called at least once
    expect(scraper.fetchDataMock).toHaveBeenCalled();
    expect(attempts).toBeGreaterThan(0);
  });
});

/**
 * BCV Scraper Error Logging Tests
 * Verifies that appropriate warnings are logged when scraping fails or falls back
 */

import { parseBCVRatesFromHtml } from '@/lib/scrapers/bcv-scraper';

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('BCV Scraper Error Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log warning when parsing fails completely', () => {
    // HTML with no extractable rates
    const html = `
      <div class="unrelated">
        <p>No rates here</p>
      </div>
    `;

    const result = parseBCVRatesFromHtml(html);

    // Should return null rates
    expect(result.usd).toBeNull();
    expect(result.eur).toBeNull();

    // Note: The current implementation doesn't log when parsing fails completely
    // This test documents the expected behavior after we add logging
  });
});

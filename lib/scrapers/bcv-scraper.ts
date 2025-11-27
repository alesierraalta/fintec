/**
 * BCV Scraper - Refactored with BaseScraper and Cheerio
 * Scrapes exchange rates from Banco Central de Venezuela
 * Now uses Cheerio for robust HTML parsing instead of regex
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScraperResult, ScraperError } from './types';
import { BCV_CONFIG } from './config';

interface BCVData {
  usd: number;
  eur: number;
  lastUpdated: string;
  source: string;
}

const BCV_URL = 'https://www.bcv.org.ve';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Reasonable rate ranges for validation
const USD_MIN = 150;
const USD_MAX = 250;
const EUR_MIN = 180;
const EUR_MAX = 280;

/**
 * BCV Scraper implementation
 */
class BCVScraper extends BaseScraper<BCVData> {
  constructor() {
    super(BCV_CONFIG);
  }

  /**
   * Fetch raw HTML from BCV website
   */
  protected async _fetchData(): Promise<string> {
    // Try native https module first (Node.js)
    try {
      const https = await import('https');
      const urlModule = await import('url');

      return new Promise<string>((resolve, reject) => {
        const parsedUrl = new urlModule.URL(BCV_URL);
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.config.timeout);

        const options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
          },
          rejectUnauthorized: false, // Allow self-signed certificates
        };

        const req = https.request(options, res => {
          let data = '';

          res.on('data', chunk => {
            data += chunk.toString();
          });

          res.on('end', () => {
            clearTimeout(timeoutId);
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(
                new Error(
                  `HTTP ${res.statusCode}: ${res.statusMessage || 'Unknown'}`
                )
              );
            }
          });
        });

        req.on('error', error => {
          clearTimeout(timeoutId);
          reject(error);
        });

        req.end();
      });
    } catch (importError) {
      // Fallback to fetch if https module not available (Edge/Browser)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(BCV_URL, {
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  }

  /**
   * Parse HTML using Cheerio
   */
  protected async _parseData(data: unknown): Promise<{ usd: number | null; eur: number | null }> {
    if (typeof data !== 'string') {
      throw new ScraperError('Invalid HTML data', 'PARSE_ERROR');
    }

    const html = data;
    const $ = cheerio.load(html);

    let usd: number | null = null;
    let eur: number | null = null;

    // Strategy 1: Look for structured HTML with span and strong tags
    // Common BCV structure: <span>USD</span> ... <strong>189.00</strong>
    $('span').each((_, element) => {
      const spanText = $(element).text().trim().toUpperCase();
      
      if (spanText === 'USD' || spanText.includes('USD')) {
        // Look for strong tag nearby
        const strong = $(element).next('strong');
        if (strong.length === 0) {
          // Try parent or sibling
          const parent = $(element).parent();
          const strongInParent = parent.find('strong').first();
          if (strongInParent.length > 0) {
            const rateText = strongInParent.text().trim();
            const rate = this.parseRate(rateText);
            if (rate && rate >= USD_MIN && rate <= USD_MAX) {
              usd = rate;
            }
          }
        } else {
          const rateText = strong.text().trim();
          const rate = this.parseRate(rateText);
          if (rate && rate >= USD_MIN && rate <= USD_MAX) {
            usd = rate;
          }
        }
      }

      if (spanText === 'EUR' || spanText.includes('EUR')) {
        const strong = $(element).next('strong');
        if (strong.length === 0) {
          const parent = $(element).parent();
          const strongInParent = parent.find('strong').first();
          if (strongInParent.length > 0) {
            const rateText = strongInParent.text().trim();
            const rate = this.parseRate(rateText);
            if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
              eur = rate;
            }
          }
        } else {
          const rateText = strong.text().trim();
          const rate = this.parseRate(rateText);
          if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
            eur = rate;
          }
        }
      }
    });

    // Strategy 2: Look for divs/tables with class names containing "tasa", "rate", "cambio"
    if (!usd || !eur) {
      $('div, table').each((_, element) => {
        const classes = $(element).attr('class') || '';
        const text = $(element).text();

        if (
          /tasa|rate|cambio|dolar|euro/i.test(classes) ||
          /tasa|rate|cambio|dolar|euro/i.test(text)
        ) {
          // Look for numbers in this container
          const numbers = text.match(/\d{1,3}[,.]\d{2,}/g);
          if (numbers) {
            for (const numStr of numbers) {
              const rate = this.parseRate(numStr);
              if (rate) {
                if (!usd && rate >= USD_MIN && rate <= USD_MAX) {
                  // Check if USD context
                  if (/usd|dolar|dólar/i.test(text)) {
                    usd = rate;
                  }
                }
                if (!eur && rate >= EUR_MIN && rate <= EUR_MAX) {
                  // Check if EUR context
                  if (/eur|euro/i.test(text)) {
                    eur = rate;
                  }
                }
              }
            }
          }
        }
      });
    }

    // Strategy 3: Fallback to regex if Cheerio didn't find rates
    if (!usd || !eur) {
      const regexResult = this.extractRatesWithRegex(html);
      if (!usd && regexResult.usd) {
        usd = regexResult.usd;
      }
      if (!eur && regexResult.eur) {
        eur = regexResult.eur;
      }
    }

    return { usd, eur };
  }

  /**
   * Validate parsed data
   */
  protected _validateData(
    data: unknown
  ): ScraperError | null {
    const parsed = data as { usd: number | null; eur: number | null };

    if (parsed.usd === null && parsed.eur === null) {
      return new ScraperError(
        'Failed to extract USD and EUR rates',
        'VALIDATION_ERROR',
        undefined,
        true
      );
    }

    // At least one rate should be valid
    if (parsed.usd === null && parsed.eur === null) {
      return new ScraperError('No rates found', 'NO_DATA_ERROR', undefined, true);
    }

    return null;
  }

  /**
   * Transform parsed data into final format
   */
  protected _transformData(data: unknown): BCVData {
    const parsed = data as { usd: number | null; eur: number | null };

    // Use extracted rates or fallback to realistic defaults
    const finalUsd = parsed.usd ?? 189.0;
    const finalEur = parsed.eur ?? 221.0;

    return {
      usd: Math.round(finalUsd * 100) / 100,
      eur: Math.round(finalEur * 100) / 100,
      lastUpdated: new Date().toISOString(),
      source: parsed.usd && parsed.eur ? 'BCV' : 'BCV (fallback)',
    };
  }

  /**
   * Create error result with fallback data
   */
  protected createErrorResult(
    error: ScraperError,
    startTime: number
  ): ScraperResult<BCVData> {
    const executionTime = Date.now() - startTime;

    return {
      success: false,
      error: error.message,
      data: {
        usd: 189.0,
        eur: 221.0,
        lastUpdated: new Date().toISOString(),
        source: 'BCV (fallback - error)',
      },
      executionTime,
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Parse rate string to number
   */
  private parseRate(rateStr: string): number | null {
    try {
      // Replace comma with dot and parse
      const cleaned = rateStr.replace(',', '.').replace(/\s/g, '');
      const rate = parseFloat(cleaned);
      return isNaN(rate) ? null : rate;
    } catch {
      return null;
    }
  }

  /**
   * Fallback regex extraction (defense in depth)
   */
  private extractRatesWithRegex(html: string): {
    usd: number | null;
    eur: number | null;
  } {
    let usd: number | null = null;
    let eur: number | null = null;

    // Pattern 1: Structured HTML
    const eurPattern1 = /<span>\s*EUR\s*<\/span>[\s\S]*?<strong>\s*(\d{1,3}(?:[,\.]\d+)?)\s*<\/strong>/i;
    const eurMatch1 = html.match(eurPattern1);
    if (eurMatch1) {
      const rate = this.parseRate(eurMatch1[1]);
      if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
        eur = rate;
      }
    }

    const usdPattern1 = /<span>\s*USD\s*<\/span>[\s\S]*?<strong>\s*(\d{1,3}(?:[,\.]\d+)?)\s*<\/strong>/i;
    const usdMatch1 = html.match(usdPattern1);
    if (usdMatch1) {
      const rate = this.parseRate(usdMatch1[1]);
      if (rate && rate >= USD_MIN && rate <= USD_MAX) {
        usd = rate;
      }
    }

    // Fallback patterns
    if (!eur) {
      const eurPatterns = [
        /EUR\s*<\/span>[\s\S]*?<strong>\s*(\d{1,3}[,\.]\d{2,})/i,
        /euro[^<]*<strong>\s*(\d{1,3}[,\.]\d{2,})/i,
        /EUR.*?(\d{1,3}[,\.]\d{2,})/i,
      ];

      for (const pattern of eurPatterns) {
        const match = html.match(pattern);
        if (match) {
          const rate = this.parseRate(match[1]);
          if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
            eur = rate;
            break;
          }
        }
      }
    }

    if (!usd) {
      const usdPatterns = [
        /USD\s*<\/span>[\s\S]*?<strong>\s*(\d{1,3}[,\.]\d{2,})/i,
        /dolar[^<]*<strong>\s*(\d{1,3}[,\.]\d{2,})/i,
        /USD.*?(\d{1,3}[,\.]\d{2,})/i,
      ];

      for (const pattern of usdPatterns) {
        const match = html.match(pattern);
        if (match) {
          const rate = this.parseRate(match[1]);
          if (rate && rate >= USD_MIN && rate <= USD_MAX) {
            usd = rate;
            break;
          }
        }
      }
    }

    return { usd, eur };
  }
}

// Singleton instance
let scraperInstance: BCVScraper | null = null;

/**
 * Main scraping function - maintains backward compatibility
 */
export async function scrapeBCVRates(): Promise<ScraperResult<BCVData>> {
  if (!scraperInstance) {
    scraperInstance = new BCVScraper();
  }

  return scraperInstance.scrape();
}

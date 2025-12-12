/**
 * BCV Scraper - Refactored with BaseScraper and Cheerio
 * Scrapes exchange rates from Banco Central de Venezuela
 * Now uses Cheerio for robust HTML parsing instead of regex
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScraperResult, ScraperError } from './types';
import { BCV_CONFIG } from './config';
import { parseLocaleNumber } from './parsers/number';
import { STATIC_BCV_FALLBACK_RATES } from '@/lib/services/rates-fallback';

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
const USD_MIN = 50;
const USD_MAX = 10000;
const EUR_MIN = 50;
const EUR_MAX = 10000;

export type ParsedBCVRates = {
  usd: number | null;
  eur: number | null;
  meta: {
    strategyUsed: 'known-container' | 'dom' | 'regex';
    confidence: number;
  };
};

export function parseBCVRatesFromHtml(html: string): ParsedBCVRates {
  const $ = cheerio.load(html);

  const extractFromSelectors = (
    selectors: string[],
    currencyCode: 'USD' | 'EUR'
  ): number | null => {
    for (const selector of selectors) {
      const container = $(selector);
      if (!container.length) {
        continue;
      }

      const strongText = container.find('strong').first().text();
      const rate = parseLocaleNumber(strongText);
      if (!rate) {
        continue;
      }

      if (currencyCode === 'USD' && rate >= USD_MIN && rate <= USD_MAX) {
        return rate;
      }
      if (currencyCode === 'EUR' && rate >= EUR_MIN && rate <= EUR_MAX) {
        return rate;
      }
    }

    return null;
  };

  let usd: number | null = extractFromSelectors(['#dolar'], 'USD');
  let eur: number | null = extractFromSelectors(['#euro'], 'EUR');

  let strategyUsed: ParsedBCVRates['meta']['strategyUsed'] = 'known-container';
  let confidence = usd && eur ? 0.95 : 0.85;

  if (!usd || !eur) {
    strategyUsed = 'dom';
    confidence = 0.8;

    $('strong').each((_, element) => {
      if (usd && eur) {
        return false;
      }

      const strongText = $(element).text().trim();
      const rate = parseLocaleNumber(strongText);
      if (!rate) {
        return;
      }

      const parent = $(element).parent();
      const contextText = [
        parent.text(),
        parent.parent().text(),
        parent.parent().parent().text(),
      ]
        .join(' ')
        .toUpperCase();

      if (!usd && /USD/.test(contextText) && rate >= USD_MIN && rate <= USD_MAX) {
        usd = rate;
      }

      if (!eur && /EUR/.test(contextText) && rate >= EUR_MIN && rate <= EUR_MAX) {
        eur = rate;
      }
    });

    confidence = usd && eur ? 0.85 : 0.75;
  }

  if (!usd || !eur) {
    const regexResult = extractRatesWithRegexFromHtml(html);
    usd = usd ?? regexResult.usd;
    eur = eur ?? regexResult.eur;

    if (usd || eur) {
      strategyUsed = 'regex';
      confidence = 0.65;
    }
  }

  // Heuristic: EUR should generally be higher than USD (VES per unit)
  if (usd && eur && eur < usd) {
    confidence = Math.min(confidence, 0.5);
  }

  return {
    usd,
    eur,
    meta: {
      strategyUsed,
      confidence,
    },
  };
}

function extractRatesWithRegexFromHtml(html: string): { usd: number | null; eur: number | null } {
  let usd: number | null = null;
  let eur: number | null = null;

  const eurPattern =
    /<span[^>]*>\s*EUR\s*<\/span>[\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>/i;
  const usdPattern =
    /<span[^>]*>\s*USD\s*<\/span>[\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>/i;

  const eurMatch = html.match(eurPattern);
  if (eurMatch) {
    const rate = parseLocaleNumber(eurMatch[1]);
    if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
      eur = rate;
    }
  }

  const usdMatch = html.match(usdPattern);
  if (usdMatch) {
    const rate = parseLocaleNumber(usdMatch[1]);
    if (rate && rate >= USD_MIN && rate <= USD_MAX) {
      usd = rate;
    }
  }

  if (!eur) {
    const fallbackEurPattern =
      /EUR[\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>/i;
    const match = html.match(fallbackEurPattern);
    if (match) {
      const rate = parseLocaleNumber(match[1]);
      if (rate && rate >= EUR_MIN && rate <= EUR_MAX) {
        eur = rate;
      }
    }
  }

  if (!usd) {
    const fallbackUsdPattern =
      /USD[\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>/i;
    const match = html.match(fallbackUsdPattern);
    if (match) {
      const rate = parseLocaleNumber(match[1]);
      if (rate && rate >= USD_MIN && rate <= USD_MAX) {
        usd = rate;
      }
    }
  }

  return { usd, eur };
}

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
    try {
      const https = await import('https');
      const urlModule = await import('url');

      const maxRedirects = 3;
      const rejectUnauthorized = process.env.BCV_TLS_STRICT === '1';

      const fetchWithHttps = (
        url: string,
        redirectCount: number = 0
      ): Promise<string> =>
        new Promise<string>((resolve, reject) => {
          const startTime = Date.now();
          const parsedUrl = new urlModule.URL(url);

          let completed = false;
          let req: any;

          const timeoutId = setTimeout(() => {
            try {
              req?.destroy();
            } catch {
              // ignore
            }
            if (!completed) {
              completed = true;
              reject(
                new ScraperError(
                  'Request timeout',
                  'ETIMEDOUT',
                  undefined,
                  true
                )
              );
            }
          }, this.config.timeout);

          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
              'User-Agent': USER_AGENT,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
              'Cache-Control': 'no-cache',
            },
            rejectUnauthorized,
          };

          req = https.request(options, res => {
            const statusCode = res.statusCode ?? 0;

            // Follow redirects (defensive; should be rare for BCV_URL)
            if ([301, 302, 303, 307, 308].includes(statusCode)) {
              const location = res.headers.location;
              res.resume(); // drain

              clearTimeout(timeoutId);
              completed = true;

              if (!location) {
                reject(
                  new ScraperError(
                    `HTTP ${statusCode}: Redirect with no Location header`,
                    'HTTP_REDIRECT',
                    statusCode,
                    true
                  )
                );
                return;
              }

              if (redirectCount >= maxRedirects) {
                reject(
                  new ScraperError(
                    `Too many redirects (>${maxRedirects})`,
                    'HTTP_REDIRECT',
                    statusCode,
                    true
                  )
                );
                return;
              }

              const nextUrl = new urlModule.URL(location, parsedUrl).toString();
              resolve(fetchWithHttps(nextUrl, redirectCount + 1));
              return;
            }

            let data = '';
            res.on('data', chunk => {
              data += chunk.toString();
            });

            res.on('end', () => {
              clearTimeout(timeoutId);
              if (completed) {
                return;
              }
              completed = true;

              const durationMs = Date.now() - startTime;
              const bytes = new TextEncoder().encode(data).length;

              if (statusCode >= 200 && statusCode < 300) {
                resolve(data);
                return;
              }

              reject(
                new ScraperError(
                  `HTTP ${statusCode}: ${res.statusMessage || 'Unknown'} (${durationMs}ms, ${bytes} bytes)`,
                  'HTTP_ERROR',
                  statusCode,
                  [429, 500, 502, 503, 504].includes(statusCode)
                )
              );
            });
          });

          req.on('error', (error: unknown) => {
            clearTimeout(timeoutId);
            if (completed) {
              return;
            }
            completed = true;

            const durationMs = Date.now() - startTime;
            const code = (error as any)?.code as string | undefined;
            const message = error instanceof Error ? error.message : String(error);

            reject(
              new ScraperError(
                `${message} (${durationMs}ms)`,
                code || 'NETWORK_ERROR',
                undefined,
                code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT'
              )
            );
          });

          req.end();
        });

      return await fetchWithHttps(BCV_URL);
    } catch (importError) {
      // Fallback to fetch if https module not available (Edge/Browser)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(BCV_URL, {
          signal: controller.signal,
          cache: 'no-store',
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
          throw new ScraperError(
            `HTTP ${response.status}: ${response.statusText}`,
            'HTTP_ERROR',
            response.status,
            [429, 500, 502, 503, 504].includes(response.status)
          );
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof ScraperError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new ScraperError(
            'Request timeout',
            'ETIMEDOUT',
            undefined,
            true
          );
        }

        throw new ScraperError(
          error instanceof Error ? error.message : 'Unknown error',
          'NETWORK_ERROR',
          undefined,
          true
        );
      }
    }
  }

  /**
   * Parse HTML using Cheerio
   */
  protected async _parseData(data: unknown): Promise<ParsedBCVRates> {
    if (typeof data !== 'string') {
      throw new ScraperError('Invalid HTML data', 'PARSE_ERROR');
    }

    return parseBCVRatesFromHtml(data);
  }

  /**
   * Validate parsed data
   */
  protected _validateData(data: unknown): ScraperError | null {
    const parsed = data as ParsedBCVRates;

    if (parsed.usd === null && parsed.eur === null) {
      return new ScraperError(
        'Failed to extract USD and EUR rates',
        'VALIDATION_ERROR',
        undefined,
        true
      );
    }

    return null;
  }

  /**
   * Transform parsed data into final format
   */
  protected _transformData(data: unknown): BCVData {
    const parsed = data as ParsedBCVRates;

    // Use extracted rates or fallback to realistic defaults
    const finalUsd = parsed.usd ?? STATIC_BCV_FALLBACK_RATES.usd;
    const finalEur = parsed.eur ?? STATIC_BCV_FALLBACK_RATES.eur;

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
        usd: STATIC_BCV_FALLBACK_RATES.usd,
        eur: STATIC_BCV_FALLBACK_RATES.eur,
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
    return parseLocaleNumber(rateStr);
  }

  /**
   * Fallback regex extraction (defense in depth)
   */
  private extractRatesWithRegex(html: string): {
    usd: number | null;
    eur: number | null;
  } {
    return extractRatesWithRegexFromHtml(html);
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

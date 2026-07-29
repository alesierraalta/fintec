import {
  BINANCE_P2P_MAX_AMOUNT_MINOR,
  BINANCE_P2P_MIN_AMOUNT_MINOR,
  BINANCE_P2P_PAYMENT_IDENTIFIERS,
  BINANCE_P2P_PAYMENT_LABELS,
  BINANCE_P2P_SIDES,
  type BinanceP2PExactQuantity,
  type BinanceP2POffer,
  type BinanceP2POffersQuery,
  type BinanceP2POffersResult,
  type BinanceP2PPaymentIdentifier,
  type BinanceP2PPaymentMethod,
  type BinanceP2PSide,
} from '@/types/binance-p2p-offers';

const BINANCE_P2P_API =
  'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const FRESH_CACHE_MS = 30_000;
const STALE_CACHE_MS = 120_000;
const UPSTREAM_TIMEOUT_MS = 5_000;
const RETRY_DELAY_MS = 150;
const MAX_CACHE_ENTRIES = 100;
const MAX_IN_FLIGHT_ENTRIES = 100;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface CacheEntry {
  result: BinanceP2POffersResult;
  cachedAt: number;
}

interface ParsedPaymentMethod {
  identifiers: string[];
  method: BinanceP2PPaymentMethod;
}

interface BinanceP2POffersServiceOptions {
  fetcher?: Fetcher;
  now?: () => number;
  retryDelayMs?: number;
}

class UpstreamRequestError extends Error {
  constructor(public readonly retryable: boolean) {
    super('Binance P2P upstream request failed');
  }
}

const paymentIdentifierSet = new Set<string>(BINANCE_P2P_PAYMENT_IDENTIFIERS);
const sideSet = new Set<string>(BINANCE_P2P_SIDES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function parseNonNegativeInteger(value: unknown, max: number): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max
    ? parsed
    : null;
}

function parseMinorUnits(value: unknown, scale = 2): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return null;

  const whole = match[1];
  const fraction = match[2] ?? '';
  const discarded = fraction.slice(scale);
  if (/[1-9]/.test(discarded)) return null;

  const minorText =
    `${whole}${fraction.slice(0, scale).padEnd(scale, '0')}`.replace(
      /^0+(?=\d)/,
      ''
    );
  const parsed = Number(minorText);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseRateBasisPoints(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return null;
  return Math.round(parsed * 10_000);
}

function parseExactQuantity(
  value: unknown,
  scaleValue: unknown
): BinanceP2PExactQuantity | null {
  if (typeof value !== 'string') return null;
  const decimal = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(decimal);
  const scale = parseNonNegativeInteger(scaleValue, 18);

  if (!match || scale === null || (match[2]?.length ?? 0) > scale) return null;
  if (!/[1-9]/.test(decimal)) return null;

  return { value: decimal, scale };
}

function isKnownPaymentIdentifier(
  value: string
): value is BinanceP2PPaymentIdentifier {
  return paymentIdentifierSet.has(value);
}

function parsePaymentMethod(value: unknown): ParsedPaymentMethod | null {
  if (!isRecord(value)) return null;

  const identifier = getBoundedString(value.identifier, 80);
  const payType = getBoundedString(value.payType, 80);
  const identifiers = [identifier, payType].filter(
    (candidate): candidate is string => candidate !== null
  );
  if (identifiers.length === 0) return null;

  const knownIdentifier = identifiers.find(
    (candidate): candidate is BinanceP2PPaymentIdentifier =>
      candidate !== 'ALL' && isKnownPaymentIdentifier(candidate)
  );
  const normalizedIdentifier = knownIdentifier ?? identifiers[0];
  const rawName =
    getBoundedString(value.tradeMethodName, 80) ??
    getBoundedString(value.tradeMethodShortName, 80);
  const name =
    knownIdentifier !== undefined
      ? BINANCE_P2P_PAYMENT_LABELS[knownIdentifier]
      : (rawName ?? normalizedIdentifier);

  return {
    identifiers,
    method: { identifier: normalizedIdentifier, name },
  };
}

function mapOffer(
  value: unknown,
  query: BinanceP2POffersQuery
): BinanceP2POffer | null {
  if (!isRecord(value) || !isRecord(value.adv) || !isRecord(value.advertiser)) {
    return null;
  }

  const adv = value.adv;
  const advertiser = value.advertiser;
  const expectedAdvertiserSide: BinanceP2PSide =
    query.side === 'BUY' ? 'SELL' : 'BUY';
  const advertiserSide = getBoundedString(adv.tradeType, 4);

  if (
    advertiserSide !== expectedAdvertiserSide ||
    adv.asset !== 'USDT' ||
    adv.fiatUnit !== 'VES' ||
    adv.isTradable === false
  ) {
    return null;
  }

  const id = getBoundedString(adv.advNo, 100);
  const priceMinor = parseMinorUnits(adv.price);
  const minFiatMinor = parseMinorUnits(adv.minSingleTransAmount);
  const configuredMaxMinor = parseMinorUnits(adv.maxSingleTransAmount);
  const dynamicMaxMinor = parseMinorUnits(adv.dynamicMaxSingleTransAmount);
  const maxFiatMinor =
    configuredMaxMinor === null
      ? null
      : dynamicMaxMinor !== null && dynamicMaxMinor > 0
        ? Math.min(configuredMaxMinor, dynamicMaxMinor)
        : configuredMaxMinor;
  const availableQuantity =
    parseExactQuantity(adv.tradableQuantity, adv.assetScale) ??
    parseExactQuantity(adv.surplusAmount, adv.assetScale);

  if (
    id === null ||
    priceMinor === null ||
    priceMinor <= 0 ||
    minFiatMinor === null ||
    maxFiatMinor === null ||
    maxFiatMinor < minFiatMinor ||
    availableQuantity === null ||
    query.amountMinor < minFiatMinor ||
    query.amountMinor > maxFiatMinor
  ) {
    return null;
  }

  if (!Array.isArray(adv.tradeMethods)) return null;
  const parsedPaymentMethods = adv.tradeMethods
    .map(parsePaymentMethod)
    .filter((method): method is ParsedPaymentMethod => method !== null);

  if (
    query.paymentMethod !== 'ALL' &&
    !parsedPaymentMethods.some(({ identifiers }) =>
      identifiers.includes(query.paymentMethod)
    )
  ) {
    return null;
  }

  const seenPaymentMethods = new Set<string>();
  const paymentMethods = parsedPaymentMethods.flatMap(({ method }) => {
    if (seenPaymentMethods.has(method.identifier)) return [];
    seenPaymentMethods.add(method.identifier);
    return [method];
  });
  if (paymentMethods.length === 0) return null;

  const nickname = getBoundedString(advertiser.nickName, 80);
  const monthOrderCount = parseNonNegativeInteger(
    advertiser.monthOrderCount,
    1_000_000_000
  );
  if (nickname === null || monthOrderCount === null) return null;

  const payTimeLimit = parseNonNegativeInteger(adv.payTimeLimit, 1_440);

  return {
    id,
    advertiserSide,
    priceMinor,
    availableQuantity,
    minFiatMinor,
    maxFiatMinor,
    paymentMethods,
    payTimeLimitMinutes:
      payTimeLimit !== null && payTimeLimit > 0 ? payTimeLimit : null,
    merchant: {
      nickname,
      monthOrderCount,
      monthCompletionRateBps: parseRateBasisPoints(advertiser.monthFinishRate),
      positiveRateBps: parseRateBasisPoints(advertiser.positiveRate),
    },
  };
}

export function formatBinanceP2PTransAmount(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError('amountMinor must be a non-negative safe integer');
  }

  const whole = Math.floor(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

function assertValidQuery(query: BinanceP2POffersQuery): void {
  if (
    !sideSet.has(query.side) ||
    !Number.isSafeInteger(query.amountMinor) ||
    query.amountMinor < BINANCE_P2P_MIN_AMOUNT_MINOR ||
    query.amountMinor > BINANCE_P2P_MAX_AMOUNT_MINOR ||
    !paymentIdentifierSet.has(query.paymentMethod)
  ) {
    throw new TypeError('Invalid Binance P2P offers query');
  }
}

function getQueryKey(query: BinanceP2POffersQuery): string {
  return `${query.side}:${query.amountMinor}:${query.paymentMethod}`;
}

export class BinanceP2POffersService {
  private readonly fetcher: Fetcher;
  private readonly now: () => number;
  private readonly retryDelayMs: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<BinanceP2POffersResult>
  >();

  constructor(options: BinanceP2POffersServiceOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
    this.retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
  }

  async search(query: BinanceP2POffersQuery): Promise<BinanceP2POffersResult> {
    assertValidQuery(query);
    const key = getQueryKey(query);
    const now = this.now();
    const cached = this.cache.get(key);

    if (cached && now - cached.cachedAt < FRESH_CACHE_MS) {
      this.touchCacheEntry(key, cached);
      return cached.result;
    }

    const existingRequest = this.inFlight.get(key);
    if (existingRequest) return existingRequest;

    const request = this.fetchAndCache(query, key);
    if (this.inFlight.size >= MAX_IN_FLIGHT_ENTRIES) return request;

    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key);
    }
  }

  private async fetchAndCache(
    query: BinanceP2POffersQuery,
    key: string
  ): Promise<BinanceP2POffersResult> {
    try {
      const result = await this.fetchWithRetry(query);
      const entry = { result, cachedAt: this.now() };
      this.touchCacheEntry(key, entry);
      this.trimCache();
      return result;
    } catch {
      const cached = this.cache.get(key);
      if (cached && this.now() - cached.cachedAt <= STALE_CACHE_MS) {
        this.touchCacheEntry(key, cached);
        return { ...cached.result, status: 'stale' };
      }

      return {
        status: 'unavailable',
        query,
        offers: [],
        fetchedAt: null,
      };
    }
  }

  private async fetchWithRetry(
    query: BinanceP2POffersQuery
  ): Promise<BinanceP2POffersResult> {
    try {
      return await this.fetchOnce(query);
    } catch (error) {
      if (!(error instanceof UpstreamRequestError) || !error.retryable) {
        throw error;
      }

      if (this.retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
      return this.fetchOnce(query);
    }
  }

  private async fetchOnce(
    query: BinanceP2POffersQuery
  ): Promise<BinanceP2POffersResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await this.fetcher(BINANCE_P2P_API, {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'es-VE,es;q=0.9,en;q=0.8',
            'content-type': 'application/json',
            origin: 'https://p2p.binance.com',
            referer: 'https://p2p.binance.com/',
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            page: 1,
            rows: 20,
            payTypes:
              query.paymentMethod === 'ALL' ? [] : [query.paymentMethod],
            countries: [],
            publisherType: null,
            asset: 'USDT',
            fiat: 'VES',
            tradeType: query.side,
            transAmount: formatBinanceP2PTransAmount(query.amountMinor),
            proMerchantAds: false,
          }),
        });
      } catch {
        throw new UpstreamRequestError(true);
      }

      if (!response.ok) {
        throw new UpstreamRequestError(response.status >= 500);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new UpstreamRequestError(false);
      }

      if (!isRecord(payload) || !Array.isArray(payload.data)) {
        throw new UpstreamRequestError(false);
      }

      const offers: BinanceP2POffer[] = [];
      for (const entry of payload.data) {
        const offer = mapOffer(entry, query);
        if (offer) offers.push(offer);
      }

      return {
        status: offers.length > 0 ? 'live' : 'empty',
        query,
        offers,
        fetchedAt: new Date(this.now()).toISOString(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private touchCacheEntry(key: string, entry: CacheEntry): void {
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  private trimCache(): void {
    const now = this.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.cachedAt > STALE_CACHE_MS) this.cache.delete(key);
    }

    while (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
  }
}

export const binanceP2POffersService = new BinanceP2POffersService();

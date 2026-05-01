type BackendFeatureFlagOptions = {
  requestMemoFlag?: string;
  sharedReadCacheFlag?: string;
  scraperThrottleFlag?: string;
  unifiedScraperFlag?: string;
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes']);
const FALSY_VALUES = new Set(['0', 'false', 'no']);

const DEFAULT_SCRAPER_INTERVAL_MS = 60_000;
const THROTTLED_SCRAPER_INTERVAL_MS = 300_000;

function normalizeFlag(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function isTruthyFlag(value?: string): boolean {
  return TRUTHY_VALUES.has(normalizeFlag(value));
}

function isExplicitlyDisabled(value?: string): boolean {
  return FALSY_VALUES.has(normalizeFlag(value));
}

export function isBackendRequestMemoEnabled(
  options: BackendFeatureFlagOptions = {}
): boolean {
  return !isExplicitlyDisabled(
    options.requestMemoFlag ?? process.env.BACKEND_REQUEST_MEMO
  );
}

export function isBackendSharedReadCacheEnabled(
  options: BackendFeatureFlagOptions = {}
): boolean {
  return isTruthyFlag(
    options.sharedReadCacheFlag ?? process.env.BACKEND_SHARED_READ_CACHE
  );
}

export function isBackendScraperThrottleEnabled(
  options: BackendFeatureFlagOptions = {}
): boolean {
  return isTruthyFlag(
    options.scraperThrottleFlag ?? process.env.BACKEND_SCRAPER_THROTTLE
  );
}

export function getBackendScraperIntervalMs(
  options: BackendFeatureFlagOptions = {}
): number {
  return isBackendScraperThrottleEnabled(options)
    ? THROTTLED_SCRAPER_INTERVAL_MS
    : DEFAULT_SCRAPER_INTERVAL_MS;
}

export function isBackendUnifiedScraperEnabled(
  options: BackendFeatureFlagOptions = {}
): boolean {
  return !isExplicitlyDisabled(
    options.unifiedScraperFlag ?? process.env.BACKEND_UNIFIED_SCRAPER
  );
}

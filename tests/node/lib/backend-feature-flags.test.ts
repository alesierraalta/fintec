import {
  getBackendScraperIntervalMs,
  isBackendRequestMemoEnabled,
  isBackendScraperThrottleEnabled,
  isBackendSharedReadCacheEnabled,
  isBackendUnifiedScraperEnabled,
} from '@/lib/backend/feature-flags';

describe('isBackendRequestMemoEnabled', () => {
  it('defaults to enabled unless explicitly disabled', () => {
    expect(isBackendRequestMemoEnabled({ requestMemoFlag: undefined })).toBe(
      true
    );
    expect(isBackendRequestMemoEnabled({ requestMemoFlag: '' })).toBe(true);
    expect(isBackendRequestMemoEnabled({ requestMemoFlag: 'true' })).toBe(true);
    expect(isBackendRequestMemoEnabled({ requestMemoFlag: 'false' })).toBe(
      false
    );
    expect(isBackendRequestMemoEnabled({ requestMemoFlag: '0' })).toBe(false);
  });
});

describe('isBackendSharedReadCacheEnabled', () => {
  it('defaults to false when the flag is missing or falsy', () => {
    expect(
      isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: undefined })
    ).toBe(false);
    expect(isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: '' })).toBe(
      false
    );
    expect(isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: '0' })).toBe(
      false
    );
    expect(
      isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: 'false' })
    ).toBe(false);
  });

  it('enables the cache only for accepted truthy values', () => {
    expect(isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: '1' })).toBe(
      true
    );
    expect(
      isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: 'true' })
    ).toBe(true);
    expect(
      isBackendSharedReadCacheEnabled({ sharedReadCacheFlag: ' yes ' })
    ).toBe(true);
  });
});

describe('isBackendScraperThrottleEnabled', () => {
  it('defaults to disabled when the flag is missing or falsy', () => {
    expect(
      isBackendScraperThrottleEnabled({ scraperThrottleFlag: undefined })
    ).toBe(false);
    expect(isBackendScraperThrottleEnabled({ scraperThrottleFlag: '' })).toBe(
      false
    );
    expect(isBackendScraperThrottleEnabled({ scraperThrottleFlag: '0' })).toBe(
      false
    );
    expect(
      isBackendScraperThrottleEnabled({ scraperThrottleFlag: 'false' })
    ).toBe(false);
  });

  it('enables throttling only for accepted truthy values', () => {
    expect(isBackendScraperThrottleEnabled({ scraperThrottleFlag: '1' })).toBe(
      true
    );
    expect(
      isBackendScraperThrottleEnabled({ scraperThrottleFlag: 'true' })
    ).toBe(true);
    expect(
      isBackendScraperThrottleEnabled({ scraperThrottleFlag: ' yes ' })
    ).toBe(true);
  });
});

describe('getBackendScraperIntervalMs', () => {
  it('uses the default interval when throttling is off', () => {
    expect(
      getBackendScraperIntervalMs({ scraperThrottleFlag: undefined })
    ).toBe(60000);
    expect(getBackendScraperIntervalMs({ scraperThrottleFlag: 'false' })).toBe(
      60000
    );
  });

  it('uses the throttled interval when throttling is on', () => {
    expect(getBackendScraperIntervalMs({ scraperThrottleFlag: 'true' })).toBe(
      300000
    );
  });
});

describe('isBackendUnifiedScraperEnabled', () => {
  it('defaults to enabled unless explicitly disabled', () => {
    expect(
      isBackendUnifiedScraperEnabled({ unifiedScraperFlag: undefined })
    ).toBe(true);
    expect(isBackendUnifiedScraperEnabled({ unifiedScraperFlag: '' })).toBe(
      true
    );
    expect(isBackendUnifiedScraperEnabled({ unifiedScraperFlag: 'true' })).toBe(
      true
    );
    expect(
      isBackendUnifiedScraperEnabled({ unifiedScraperFlag: 'false' })
    ).toBe(false);
    expect(isBackendUnifiedScraperEnabled({ unifiedScraperFlag: '0' })).toBe(
      false
    );
  });
});

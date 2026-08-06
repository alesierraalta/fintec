import {
  IOS_ENGAGEMENT_VISIT_THRESHOLD,
  isIosPromptEligible,
  readVisitCount,
  recordVisitOncePerLoad,
  __resetInstallEngagementForTests,
} from '@/lib/pwa/install-engagement';

const VISIT_COUNT_KEY = 'fintec.pwa-install.visit-count';

describe('install-engagement', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetInstallEngagementForTests();
  });

  it('readVisitCount returns 0 when nothing was recorded', () => {
    expect(readVisitCount()).toBe(0);
  });

  it('readVisitCount treats a corrupt value as 0 and does not throw', () => {
    window.localStorage.setItem(VISIT_COUNT_KEY, 'not-a-number');

    expect(() => expect(readVisitCount()).toBe(0)).not.toThrow();
  });

  it('recordVisitOncePerLoad increments and persists the count', () => {
    expect(recordVisitOncePerLoad()).toBe(1);
    expect(window.localStorage.getItem(VISIT_COUNT_KEY)).toBe('1');
  });

  it('recordVisitOncePerLoad only increments once per module lifetime, regardless of call count', () => {
    recordVisitOncePerLoad();
    recordVisitOncePerLoad();
    recordVisitOncePerLoad();

    expect(readVisitCount()).toBe(1);
  });

  it('isIosPromptEligible is false below the threshold and true at/above it', () => {
    expect(isIosPromptEligible(IOS_ENGAGEMENT_VISIT_THRESHOLD - 1)).toBe(false);
    expect(isIosPromptEligible(IOS_ENGAGEMENT_VISIT_THRESHOLD)).toBe(true);
  });
});

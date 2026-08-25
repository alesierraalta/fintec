import {
  isPageNavigation,
  normalizePathname,
} from '@/lib/page-visits/predicate';

describe('page visit predicate', () => {
  const request = (url: string, headers: Record<string, string> = {}) =>
    new Request(`https://fintec.test${url}`, { headers });
  it('accepts documents, strips query and rejects non-pages/bots', () => {
    expect(isPageNavigation(request('/dashboard?secret=value'))).toBe(true);
    expect(normalizePathname('/dashboard///')).toBe('/dashboard');
    expect(isPageNavigation(request('/api/data'))).toBe(false);
    expect(
      isPageNavigation(request('/home', { accept: 'application/json' }))
    ).toBe(false);
    expect(
      isPageNavigation(request('/home', { 'user-agent': 'FriendlyCrawlerBot' }))
    ).toBe(false);
  });
});

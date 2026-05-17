import {
  hasCompleteBCVRates,
  parseBCVRatesFromHtml,
} from '@/lib/scrapers/bcv-scraper';

describe('BCV scraper fallback protection', () => {
  it('extracts USD and EUR from BCV currency containers', () => {
    const html = `
      <section id="dolar"><span>USD</span><strong>151,52</strong></section>
      <section id="euro"><span>EUR</span><strong>172,42</strong></section>
    `;

    const parsed = parseBCVRatesFromHtml(html);

    expect(parsed.usd).toBe(151.52);
    expect(parsed.eur).toBe(172.42);
    expect(hasCompleteBCVRates(parsed)).toBe(true);
  });

  it('does not consider partial extraction complete', () => {
    const html = `
      <section id="dolar"><span>USD</span><strong>151,52</strong></section>
    `;

    const parsed = parseBCVRatesFromHtml(html);

    expect(parsed.usd).toBe(151.52);
    expect(parsed.eur).toBeNull();
    expect(hasCompleteBCVRates(parsed)).toBe(false);
  });
});

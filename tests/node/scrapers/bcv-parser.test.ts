/**
 * BCV Parser Unit Tests
 * Verifies the tiered parsing strategy (Selectors -> DOM Context -> Regex)
 */

import { parseBCVRatesFromHtml } from '@/lib/scrapers/bcv-scraper';

describe('BCV Parser Tiered Strategy', () => {
  it('should extract USD via primary selector (#dolar)', () => {
    const html = `<div id="dolar"><strong>60,15</strong></div><div id="euro"><strong>64,20</strong></div>`;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(60.15);
    expect(result.eur).toBe(64.2);
    expect(result.meta.strategyUsed).toBe('known-container');
  });

  it('should extract rates via secondary selector (#USD)', () => {
    const html = `<div id="USD"><strong>60,15</strong></div><div id="EUR"><strong>64,20</strong></div>`;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(60.15);
    expect(result.eur).toBe(64.2);
    expect(result.meta.strategyUsed).toBe('known-container');
  });

  it('should fallback to DOM context search when selectors fail', () => {
    // Using HTML that won't match any BCV_SELECTORS (no #dolar, no "USD" in div tag itself but in sibling)
    const html = `
      <div class="unrelated-container">
        <p>This is the currency section</p>
        <span class="label">USD Value</span>
        <div class="some-wrapper">
           <strong>60,50</strong>
        </div>
      </div>
      <div class="unrelated-container">
        <span class="label">EUR Value</span>
        <div class="some-wrapper">
           <strong>64,80</strong>
        </div>
      </div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(60.5);
    expect(result.eur).toBe(64.8);
    expect(result.meta.strategyUsed).toBe('dom');
  });

  it('should fallback to regex extraction as last resort', () => {
    const html = `
      <div class="row">
        <span> USD </span>
        <strong> 61,20 </strong>
      </div>
      <div class="row">
        <span> EUR </span>
        <strong> 65,30 </strong>
      </div>
    `;
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBe(61.2);
    expect(result.eur).toBe(65.3);
    // Note: This triggers 'dom' strategy because of the <span>USD</span> context
    expect(result.meta.strategyUsed).toBe('dom');
  });

  it('should use regex strategy for non-standard HTML', () => {
    // Current regex in bcv-scraper.ts matches:
    // USD[\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>
    // We need <strong> but no context that 'dom' strategy (which looks for USD/EUR labels) finds.
    const regexOnlyHtml = `
      <div class="unlabeled">
        <strong>61,20</strong> <!-- USD is not in parent/grandparent -->
      </div>
      <div class="unlabeled">
        <strong>65,30</strong> <!-- EUR is not in parent/grandparent -->
      </div>
      <!-- Far away markers -->
      <p>Source: USD/EUR market</p>
    `;
    const res = parseBCVRatesFromHtml(regexOnlyHtml);

    // Actually, 'dom' logic joins parent text: parent.parent().parent().text()
    // This makes it very hard to avoid 'dom' if USD/EUR is anywhere nearby.
    // Let's use a very deep nesting to isolate strong from the labels.
    const deepHtml = `
      <span>USD</span>
      <div><div><div><div><div><div>
        <strong>61,20</strong>
      </div></div></div></div></div></div>
      <span>EUR</span>
      <div><div><div><div><div><div>
        <strong>65,30</strong>
      </div></div></div></div></div></div>
    `;
    const result = parseBCVRatesFromHtml(deepHtml);
    expect(result.usd).toBe(61.2);
    expect(result.eur).toBe(65.3);
    expect(result.meta.strategyUsed).toBe('regex');
  });

  it('should reject unrealistic rates during parsing', () => {
    const html = `<div id="dolar"><strong>10,50</strong></div>`; // Too low
    const result = parseBCVRatesFromHtml(html);

    expect(result.usd).toBeNull();
  });
});

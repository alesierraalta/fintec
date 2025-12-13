import fs from 'fs';
import path from 'path';

import { parseBCVRatesFromHtml } from '@/lib/scrapers/bcv-scraper';
import { parseLocaleNumber } from '@/lib/scrapers/parsers/number';

function readFixture(relativePath: string): string {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('BCV Parser (fixtures)', () => {
  it.each([
    {
      fixture: 'tests/fixtures/bcv/homepage-sample-1.html',
      expectedUsd: 267.7499,
      expectedEur: 314.38122258,
      expectedStrategy: 'known-container',
    },
    {
      fixture: 'tests/fixtures/bcv/homepage-sample-2.html',
      expectedUsd: 267.7499,
      expectedEur: 314.38122258,
      expectedStrategy: 'known-container',
    },
    {
      fixture: 'tests/fixtures/bcv/homepage-mutated.html',
      expectedUsd: 267.7499,
      expectedEur: 314.38122258,
      expectedStrategy: 'dom',
    },
  ])(
    'extracts USD/EUR from $fixture',
    ({ fixture, expectedUsd, expectedEur, expectedStrategy }) => {
      const html = readFixture(fixture);
      const parsed = parseBCVRatesFromHtml(html);

      expect(parsed.usd).not.toBeNull();
      expect(parsed.eur).not.toBeNull();

      expect(parsed.usd).toBeCloseTo(expectedUsd, 4);
      expect(parsed.eur).toBeCloseTo(expectedEur, 6);

      expect(parsed.meta.strategyUsed).toBe(expectedStrategy);
      expect(parsed.meta.confidence).toBeGreaterThan(0.5);
    }
  );

  it('parses locale-specific rate formats', () => {
    expect(parseLocaleNumber('283,49843701')).toBeCloseTo(283.49843701, 6);
    expect(parseLocaleNumber('1.234,56')).toBeCloseTo(1234.56, 2);
    expect(parseLocaleNumber('1,234.56')).toBeCloseTo(1234.56, 2);
    expect(parseLocaleNumber('283.49')).toBeCloseTo(283.49, 2);
  });
});


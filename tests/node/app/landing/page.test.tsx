import { metadata } from '@/app/landing/page';

describe('LandingPage metadata (app/landing/page.tsx)', () => {
  it('metadata canonical points to /', () => {
    expect(metadata.alternates?.canonical).toBe('/');
  });

  it('metadata og:url stays /landing', () => {
    expect(metadata.openGraph?.url).toBe('/landing');
  });

  it('metadata has title', () => {
    expect(metadata.title).toContain('FinTec');
  });

  it('metadata has description', () => {
    expect(metadata.description).toContain('tasas del BCV');
  });
});

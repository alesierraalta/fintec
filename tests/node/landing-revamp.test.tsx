import { renderToStaticMarkup } from 'react-dom/server';
import { HeroSection } from '@/app/(public)/components/hero-section';
import { EvidenceStrip } from '@/app/(public)/components/evidence-strip';
import { FeaturesSection } from '@/app/(public)/components/features-section';
import { RateCockpit } from '@/app/(public)/components/rate-cockpit';

describe('landing revamp', () => {
  it('keeps rates out of the hero and uses a management-first CTA', () => {
    const html = renderToStaticMarkup(<HeroSection />);
    expect(html).not.toContain('Tasas de referencia');
    expect(html).toContain('/auth/register');
    expect(html).toContain('tasas-en-vivo');
    expect(html).toContain('Movimiento');
    expect(html).toContain('Presupuesto');
    expect(html).toContain('Decisión');
  });

  it('renders one cockpit with explicit source tabs', () => {
    const html = renderToStaticMarkup(<RateCockpit />);
    expect(html).toContain('Tasas de referencia');
    expect(html).toContain('BCV');
    expect(html).toContain('P2P');
    expect(html).toContain('15 minutos');
  });

  it('uses verifiable evidence and no repeated rate trust claims', () => {
    const evidence = renderToStaticMarkup(<EvidenceStrip />);
    const features = renderToStaticMarkup(<FeaturesSection />);
    expect(evidence).not.toMatch(/Tasas BCV|Mercado P2P/);
    expect(features).not.toContain('Tasas en Tiempo Real');
  });
});

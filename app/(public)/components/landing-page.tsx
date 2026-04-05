import { LandingNav } from './landing-nav';
import { HeroSection } from './hero-section';
import { LiveRatesSection } from './live-rates-section';
import { StatsSection } from './stats-section';
import { FeaturesSection } from './features-section';
import { TestimonialsSection } from './testimonials-section';
import { FAQSection } from './faq-section';
import { PricingPreviewSection } from './pricing-preview-section';
import { CTASection } from './cta-section';
import { LandingFooter } from './landing-footer';
import { navLinks } from './data';

/**
 * LandingPage — Server Component for unauthenticated visitors.
 * All sections are server-rendered by default.
 * Interactive islands (mobile menu, FAQ accordion) are client components.
 */
export function LandingPage() {
  return (
    <div className="min-h-dynamic-screen bg-gradient-to-br from-background via-background to-muted/20">
      <LandingNav links={navLinks} />

      <main>
        <HeroSection />
        <LiveRatesSection />
        <StatsSection />
        <FeaturesSection />
        <TestimonialsSection />
        <FAQSection />
        <PricingPreviewSection />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}

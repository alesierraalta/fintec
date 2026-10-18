import { LandingNav } from './landing-nav';
import { HeroSection } from './hero-section';
import { RateCockpit } from './rate-cockpit';
import { EvidenceStrip } from './evidence-strip';
import { FeaturesSection } from './features-section';
import { FAQSection } from './faq-section';
import { PricingPreviewSection } from './pricing-preview-section';
import { CTASection } from './cta-section';
import { LandingFooter } from './landing-footer';
import { navLinks } from './data';

// Radius system (design rule, Cycle 1): surfaces/containers use `rounded-2xl`;
// interactive controls (buttons, tabs, icon tiles) use `rounded-xl`;
// pills/badges use `rounded-full`. Keep every landing surface consistent
// with this three-level scale.
export function LandingPage() {
  return (
    <div className="min-h-dynamic-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
      <LandingNav links={navLinks} />
      <main>
        <HeroSection />
        <RateCockpit />
        <EvidenceStrip />
        <FeaturesSection />
        <FAQSection />
        <PricingPreviewSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

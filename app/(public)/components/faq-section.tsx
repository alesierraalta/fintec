import { FAQAccordion } from './faq-accordion';
import { faqItems } from './data';
import { Reveal } from './reveal';

/**
 * FAQ section server component wrapper.
 */
export function FAQSection() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <Reveal className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Respuestas a las dudas más comunes sobre FinTec
          </p>
        </div>

        <FAQAccordion items={faqItems} />
      </Reveal>
    </section>
  );
}

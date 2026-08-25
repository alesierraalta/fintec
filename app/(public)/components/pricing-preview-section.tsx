import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Pricing preview section — honest preview of 3 real tiers.
 * Source of truth: types/subscription.ts TIER_FEATURES
 * free: $0, base: Plan Full $5.99, premium: Premium IA $9.99
 */
export function PricingPreviewSection() {
  const plans = [
    {
      name: 'Gratis',
      price: '$0',
      period: '/mes',
      description: 'Para empezar, sin costo',
      features: [
        'Cuentas ilimitadas',
        '500 transacciones/mes',
        'Reportes básicos',
        'Historial 6 meses',
      ],
      cta: 'Comenzar Gratis',
      ctaHref: '/auth/register',
      highlighted: false,
    },
    {
      name: 'Plan Full',
      price: '$5.99',
      period: '/mes',
      description: 'Todo lo esencial, sin límites',
      features: [
        'Todo lo de Gratis',
        'Transacciones ilimitadas',
        'Historial ilimitado',
        'Reportes avanzados + exportación',
        'Respaldos diarios',
        'Soporte prioritario',
      ],
      cta: 'Ver Planes',
      ctaHref: '/pricing',
      highlighted: true,
    },
    {
      name: 'Premium IA',
      price: '$9.99',
      period: '/mes',
      description: 'Potenciado con IA',
      features: [
        'Todo lo de Plan Full',
        'Categorización automática con IA',
        'Predicciones y consejos',
        'Detección de anomalías',
        'Acceso a API',
        'Soporte premium 24h',
      ],
      cta: 'Ver Planes',
      ctaHref: '/pricing',
      highlighted: false,
    },
  ];

  return (
    <section className="bg-muted/20 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Planes para cada necesidad
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Empieza gratis y escala cuando lo necesites — 3 planes reales, sin
            letra pequeña
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:mx-auto lg:max-w-6xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-8 transition-all duration-300 hover:shadow-xl ${
                plan.highlighted
                  ? 'border-primary/50 bg-card shadow-lg ring-2 ring-primary/20'
                  : 'border-border/40 bg-card/90'
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-muted/50'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            Ver comparativa completa de planes
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

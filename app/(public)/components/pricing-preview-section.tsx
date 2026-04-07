import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Pricing preview section showing Free and Premium plans.
 */
export function PricingPreviewSection() {
  const plans = [
    {
      name: 'Gratuito',
      price: '$0',
      period: '/mes',
      description: 'Perfecto para empezar',
      features: [
        'Gestión de cuentas básicas',
        'Tasas del BCV en tiempo real',
        'Transacciones ilimitadas',
        'Presupuestos mensuales',
      ],
      cta: 'Comenzar Gratis',
      ctaHref: '/auth/register',
      highlighted: false,
    },
    {
      name: 'Premium',
      price: '$4.99',
      period: '/mes',
      description: 'Para usuarios avanzados',
      features: [
        'Todo del plan Gratuito',
        'Tasas de Binance P2P',
        'Reportes avanzados',
        'Metas de ahorro',
        'Deudas y préstamos',
        'Soporte prioritario',
      ],
      cta: 'Ver Planes',
      ctaHref: '/pricing',
      highlighted: true,
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
            Empieza gratis y escala cuando lo necesites
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
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
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block w-full rounded-xl px-6 py-3 text-center font-medium transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90'
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
            Ver todos los planes
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

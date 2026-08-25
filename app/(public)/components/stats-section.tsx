import { Globe, LockKeyhole, Smartphone, Zap } from 'lucide-react';

/**
 * Trust indicators written as user benefits. Technical implementation details
 * belong in security documentation, not in the marketing landing page.
 */
export function StatsSection() {
  const trustIndicators = [
    {
      eyebrow: 'Tasas BCV',
      title: 'Fuente oficial',
      icon: Globe,
      description: 'Consulta la referencia publicada por el Banco Central.',
    },
    {
      eyebrow: 'Mercado P2P',
      title: 'Referencia actualizada',
      icon: Zap,
      description: 'Revisa valores de Binance P2P cuando estén disponibles.',
    },
    {
      eyebrow: 'Acceso flexible',
      title: 'Donde estés',
      icon: Smartphone,
      description: 'Usa FinTec desde tu teléfono o computadora.',
    },
    {
      eyebrow: 'Privacidad',
      title: 'Tus datos son tuyos',
      icon: LockKeyhole,
      description: 'Tu información permanece asociada a tu cuenta personal.',
    },
  ];

  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Pensado para tu día a día
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Información útil, sin complicaciones
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustIndicators.map((indicator) => {
            const Icon = indicator.icon;
            return (
              <article
                key={indicator.eyebrow}
                className="group rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg hover:shadow-black/5"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {indicator.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {indicator.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {indicator.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

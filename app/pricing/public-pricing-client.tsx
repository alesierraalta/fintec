'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { LandingNav } from '@/app/(public)/components/landing-nav';
import { LandingFooter } from '@/app/(public)/components/landing-footer';
import { navLinks } from '@/app/(public)/components/data';
import { TIER_FEATURES } from '@/types/subscription';

/**
 * Public pricing page — accessible without login.
 * Honest, verifiable, no checkout logic. CTAs go to /auth/register or /auth/login.
 * Authenticated users are still served by PricingPageClient via server branch.
 */
export function PublicPricingClient() {
  const tiers = [
    { key: 'free' as const, cta: 'Comenzar Gratis', href: '/auth/register' },
    {
      key: 'base' as const,
      cta: 'Empezar con Plan Full',
      href: '/auth/register',
    },
    {
      key: 'premium' as const,
      cta: 'Empezar con Premium IA',
      href: '/auth/register',
    },
  ];

  return (
    <div className="min-h-dynamic-screen bg-gradient-to-br from-background via-background to-muted/20">
      <LandingNav links={navLinks} />
      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary">
              PRECIOS HONESTOS · SIN LETRA PEQUEÑA
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Elige tu plan
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Empieza gratis y escala cuando lo necesites. Todos los planes
              incluyen tasas del BCV y soporte en español.
              <span className="mt-2 block text-sm text-muted-foreground/70">
                Precios en USD · Facturación mensual · Cancela cuando quieras
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {tiers.map(({ key, cta, href }) => {
              const tier = TIER_FEATURES[key];
              const isHighlighted = tier.highlighted;
              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-3xl border p-8 shadow-sm transition-all duration-300 hover:shadow-xl ${
                    isHighlighted
                      ? 'border-primary/50 bg-card ring-2 ring-primary/20'
                      : 'border-border/40 bg-card/90'
                  }`}
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-bold">{tier.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {key === 'free'
                        ? 'Para empezar'
                        : key === 'base'
                          ? 'Sin límites'
                          : 'Con IA'}
                    </p>
                  </div>
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      ${(tier.price / 100).toFixed(tier.price === 0 ? 0 : 2)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span className="leading-snug text-muted-foreground">
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
                      isHighlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-muted/50'
                    }`}
                  >
                    {cta}
                  </Link>
                  {key !== 'free' && (
                    <p className="mt-3 text-center text-xs text-muted-foreground/60">
                      Sin permanencia · Cancela cuando quieras
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border/40 bg-card/60 p-8">
            <h3 className="mb-6 text-center text-lg font-bold">
              Preguntas frecuentes
            </h3>
            <div className="space-y-6 text-sm">
              <div>
                <h4 className="font-semibold">¿Puedo cambiar de plan luego?</h4>
                <p className="text-muted-foreground">
                  Sí. Cambias cuando quieras desde ajustes. Los cambios se
                  aplican al ciclo vigente. Sin penalización.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">¿Qué pasa si cancelo?</h4>
                <p className="text-muted-foreground">
                  Mantienes Premium hasta fin del período y luego pasas a Gratis
                  automáticamente. Tus datos se conservan.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">¿Mis datos están seguros?</h4>
                <p className="text-muted-foreground">
                  Cifrado TLS en tránsito, RLS de Supabase y encriptación en
                  reposo. Gratis guarda 6 meses de historial; pagos ilimitado.
                </p>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground/60">
              ¿Dudas?{' '}
              <a
                href="mailto:support@fintec.com"
                className="text-primary hover:underline"
              >
                support@fintec.com
              </a>
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-primary hover:underline"
              >
                Inicia sesión
              </Link>{' '}
              y gestiona tu suscripción.
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

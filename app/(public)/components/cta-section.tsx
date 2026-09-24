import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './reveal';

/**
 * CTA section — final call to action before footer. Polished 2025-08-25
 */
export function CTASection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      {/* soft gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-blue-500/[0.06] to-purple-500/[0.08]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <Reveal className="relative mx-auto max-w-4xl text-center">
        <div className="mb-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary">
          EMPIEZA HOY
        </div>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          ¿Listo para tomar control de tus finanzas?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Únete en beta y gestiona tu dinero de forma inteligente con FinTec.
          Gratis para empezar.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
          >
            <span>Crear cuenta gratis</span>
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card/60 px-8 py-4 text-base font-semibold transition-colors hover:bg-muted/60 active:scale-[0.98]"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground/70">
          Sin tarjeta requerida · Cancela cuando quieras · Producto en beta
        </p>
      </Reveal>
    </section>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * CTA section — final call to action before footer.
 */
export function CTASection() {
  return (
    <section className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
          ¿Listo para tomar control de tus finanzas?
        </h2>
        <p className="mb-8 text-xl text-muted-foreground">
          Empieza a gestionar tu dinero de forma inteligente con FinTec
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/register"
            className="group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-primary to-blue-500 px-10 py-4 text-lg font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
          >
            <span>Crear Cuenta Gratis</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/auth/login"
            className="rounded-xl border border-border px-10 py-4 text-lg font-semibold transition-all duration-200 hover:bg-muted/50"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

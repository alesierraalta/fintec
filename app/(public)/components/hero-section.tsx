import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            BETA · ACCESO ANTICIPADO
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Controla tus Finanzas con
            <span className="block bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Tasas Actualizadas
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            La aplicación financiera más completa de Venezuela. Accede a tasas
            oficiales del BCV, precios P2P de Binance y gestiona todas tus
            finanzas en un solo lugar.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-primary to-blue-500 px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#tasas-en-vivo"
              className="flex items-center space-x-2 rounded-xl border border-border px-8 py-4 text-lg font-semibold transition-all duration-200 hover:bg-muted/50"
            >
              <Play className="h-5 w-5" />
              <span>Ver Demo</span>
            </Link>
          </div>
        </div>

        {/* App Preview — illustrative, not a real screenshot */}
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border/20 bg-card/50 shadow-2xl backdrop-blur-sm">
            <Image
              src="/hero-screenshot.svg"
              alt="Vista ilustrativa del dashboard de FinTec — interfaz en desarrollo, captura no real, solo preview ilustrativo"
              width={1200}
              height={675}
              priority
              className="w-full"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/70">
            Vista ilustrativa — interfaz en desarrollo. Captura no real.
          </p>
        </div>
      </div>
    </section>
  );
}

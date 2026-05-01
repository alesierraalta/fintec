import type { Metadata } from 'next';
import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist/WaitlistForm';
import { Shield, Smartphone, Zap } from 'lucide-react';
import { FinTecLogo } from '@/components/branding/fintec-logo';

export const metadata: Metadata = {
  title: 'FinTec Waitlist - Acceso Anticipado',
  description:
    'Sé el primero en experimentar la nueva era de las finanzas personales en Venezuela. Tasas reales, gestión total.',
};

export default function WaitlistPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[600px] w-[800px] rounded-full bg-blue-500/10 blur-[100px]" />

      {/* Nav */}
      <nav className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between p-6">
        <Link href="/" className="flex items-center space-x-2">
          <FinTecLogo
            containerClassName="w-8 h-8 md:w-10 md:h-10"
            className="rounded-lg"
            alt="FinTec"
            sizes="40px"
          />
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            FinTec
          </span>
        </Link>
        <Link href="/auth/login">
          <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Iniciar Sesión
          </button>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-grow flex-col items-center justify-center px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-16">
          <div className="mb-6 inline-flex animate-fade-in-up items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-primary"></span>
            Acceso Anticipado Limitado
          </div>

          <h1 className="mb-6 animate-fade-in-up bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-transparent [animation-delay:200ms] sm:text-5xl md:text-7xl">
            El Futuro Financiero <br className="hidden sm:block" />
            <span className="text-primary">Está Llegando.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl animate-fade-in-up text-lg leading-relaxed text-muted-foreground [animation-delay:400ms] sm:text-xl">
            Deja de luchar con múltiples apps y tasas desactualizadas.
            Regístrate en la lista de espera para obtener acceso prioritario y
            beneficios exclusivos de lanzamiento.
          </p>

          <div className="animate-fade-in-up [animation-delay:600ms]">
            <WaitlistForm />
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto grid w-full max-w-5xl animate-fade-in-up grid-cols-1 gap-6 px-4 [animation-delay:800ms] md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: 'Tasas en Tiempo Real',
              desc: 'Monitoreo 24/7 de BCV y Binance P2P sin retrasos.',
            },
            {
              icon: Smartphone,
              title: 'Experiencia Nativa',
              desc: 'Diseño fluido optimizado para iOS y Android.',
            },
            {
              icon: Shield,
              title: 'Privacidad Total',
              desc: 'Tus datos financieros encriptados y seguros.',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:bg-card/80"
            >
              <feature.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/10 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} FinTec. Todos los derechos
            reservados.
          </p>
          <div className="flex space-x-6">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacidad
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

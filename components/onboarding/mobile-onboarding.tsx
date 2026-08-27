'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { FinTecLogo } from '@/components/branding/fintec-logo';

const slides = [
  {
    title: 'Bienvenido a FinTec',
    description: 'Gestión inteligente de tus finanzas, en un solo lugar.',
    icon: Wallet,
  },
  {
    title: 'Control total',
    description: 'Organiza gastos, ingresos, presupuestos y cuentas sin esfuerzo.',
    icon: TrendingUp,
  },
  {
    title: 'Tasas reales',
    description: 'Consulta BCV y Binance P2P en tiempo real, sin salir de la app.',
    icon: ShieldCheck,
  },
] as const;

type MobileOnboardingProps = {
  onComplete: () => void;
  onSkip: () => void;
};

export function MobileOnboarding({ onComplete, onSkip }: MobileOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  const next = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((value) => value + 1);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-dynamic-screen items-center justify-center bg-black px-5 py-6 text-white backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-onboarding-title"
      aria-describedby="mobile-onboarding-description"
    >
      <div className="glass-card flex min-h-[min(42rem,calc(100dvh-3rem))] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] shadow-ios-lg">
        <div className="flex items-center justify-center px-6 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <FinTecLogo
            containerClassName="h-8 w-28"
            priority
            alt="FinTec"
          />
        </div>

        <div key={currentSlide} className="flex flex-1 flex-col items-center justify-center px-8 text-center animate-fade-in">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/30 bg-primary/15 text-primary shadow-glow">
            <Icon size={42} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h1 id="mobile-onboarding-title" className="text-ios-large-title font-semibold tracking-tight">
            {slide.title}
          </h1>
          <p id="mobile-onboarding-description" className="mt-4 max-w-xs text-ios-body text-white/65">
            {slide.description}
          </p>
        </div>

        <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-6 flex justify-center gap-2" aria-label={`Paso ${currentSlide + 1} de ${slides.length}`}>
            {slides.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 rounded-full transition-all ${index === currentSlide ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onSkip}
              className="focus-ring rounded-xl px-3 py-3 text-sm font-medium text-white/60 transition-colors hover:text-white"
              aria-label="Saltar introducción"
            >
              Saltar
            </button>
            <button
              type="button"
              onClick={next}
              className="focus-ring min-w-36 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
            >
              {isLastSlide ? 'Empezar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

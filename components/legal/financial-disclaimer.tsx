'use client';

/**
 * Informational disclaimer shown wherever the product surfaces AI output or
 * third-party market data. Burying this in the Terms is not enough: it has to
 * be visible at the point where a user could mistake the output for advice.
 */

import { Info } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type DisclaimerVariant = 'ai' | 'rates';

const MESSAGES: Record<DisclaimerVariant, string> = {
  ai: 'Las respuestas son generadas por inteligencia artificial, pueden contener errores y no constituyen asesoramiento financiero. Verifica la información antes de tomar decisiones.',
  rates:
    'Tasas obtenidas de fuentes públicas de terceros, con carácter únicamente informativo. Pueden estar desactualizadas y no constituyen asesoramiento financiero ni una oferta de cambio.',
};

interface FinancialDisclaimerProps {
  variant: DisclaimerVariant;
  className?: string;
}

export function FinancialDisclaimer({
  variant,
  className,
}: FinancialDisclaimerProps) {
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground/70',
        className
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>
        {MESSAGES[variant]}{' '}
        <Link href="/terms" className="underline hover:text-primary">
          Más información
        </Link>
      </span>
    </p>
  );
}

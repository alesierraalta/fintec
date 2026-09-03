'use client';

import Link from 'next/link';
import { memo } from 'react';
import { AlertTriangle, ArrowDownUp, RefreshCw } from 'lucide-react';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';

export interface BinanceRatesCardProps {
  snapshot: BinanceRatesSnapshot;
  mode?: 'simple' | 'full';
  onModeChange?: (next: 'simple' | 'full') => void;
}

function formatRate(rate: number): string {
  return rate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BinanceRatesComponentImpl({ snapshot }: BinanceRatesCardProps) {
  const { rates, status, message, error, loading, refetch, lastUpdatedLabel } =
    snapshot;
  return (
    <section
      aria-labelledby="binance-rate-title"
      aria-busy={loading}
      className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-ios-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/40 bg-gradient-to-br from-amber-500/10 via-card to-card px-4 py-5 sm:px-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />{' '}
            Referencia Binance
          </div>
          <h3
            id="binance-rate-title"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Tasa USDT/VES
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta la referencia actual antes de explorar ofertas P2P.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          aria-label="Actualizar tasa Binance"
          disabled={loading}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">1 USDT</p>
            <p className="amount-emphasis-main text-3xl">
              Bs. {formatRate(rates.usdt_ves)}
            </p>
          </div>
          <span
            role="status"
            className="text-xs font-medium text-muted-foreground"
          >
            {loading
              ? 'Actualizando…'
              : status === 'live'
                ? 'En vivo'
                : status === 'stale'
                  ? 'Desactualizada'
                  : 'Referencia'}
          </span>
        </div>
        {message || error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {message ?? error}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{lastUpdatedLabel}</p>
        <Link
          href="/p2p-offers"
          className="focus-ring inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Explorar ofertas P2P
        </Link>
      </div>
    </section>
  );
}

export const BinanceRatesComponent = memo(BinanceRatesComponentImpl);

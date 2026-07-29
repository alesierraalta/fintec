'use client';

import { memo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  Clock3,
  ExternalLink,
  Landmark,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import { useBinanceP2POffers } from '@/hooks/use-binance-p2p-offers';
import {
  BINANCE_P2P_MARKET_URL,
  BINANCE_P2P_MAX_AMOUNT_MINOR,
  BINANCE_P2P_MIN_AMOUNT_MINOR,
  BINANCE_P2P_PAYMENT_IDENTIFIERS,
  BINANCE_P2P_PAYMENT_LABELS,
  type BinanceP2POffersQuery,
  type BinanceP2PPaymentIdentifier,
  type BinanceP2PSide,
} from '@/types/binance-p2p-offers';

export interface BinanceRatesCardProps {
  snapshot: BinanceRatesSnapshot;
  mode?: 'simple' | 'full';
  onModeChange?: (next: 'simple' | 'full') => void;
}

const primaryPaymentMethods = BINANCE_P2P_PAYMENT_IDENTIFIERS.slice(0, 3);
const bankPaymentMethods = BINANCE_P2P_PAYMENT_IDENTIFIERS.slice(3);

function formatMinorUnits(amountMinor: number): string {
  const whole = Math.floor(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, '0');
  return `${whole.toLocaleString('es-VE')},${fraction}`;
}

function formatExactDecimal(value: string): string {
  const [whole, fraction] = value.split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? groupedWhole : `${groupedWhole},${fraction}`;
}

function formatBasisPoints(value: number | null): string {
  if (value === null) return 'Sin dato de finalización';
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, '0');
  return `${whole},${fraction}% completadas`;
}

function parseAmountToMinor(value: string): number | null {
  let normalized = value.trim().replace(/\s/g, '');
  if (normalized === '') return null;

  if (normalized.includes(',')) {
    if ((normalized.match(/,/g) ?? []).length !== 1) return null;
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = normalized.match(/\./g) ?? [];
    if (dots.length > 1) {
      normalized = normalized.replace(/\./g, '');
    } else if (dots.length === 1) {
      const fractionLength = normalized.length - normalized.indexOf('.') - 1;
      if (fractionLength === 3) normalized = normalized.replace('.', '');
    }
  }

  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;

  const minorText = `${match[1]}${(match[2] ?? '').padEnd(2, '0')}`.replace(
    /^0+(?=\d)/,
    ''
  );
  const amountMinor = Number(minorText);
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

function BinanceRatesComponentImpl(_props: BinanceRatesCardProps) {
  const [side, setSide] = useState<BinanceP2PSide>('BUY');
  const [amount, setAmount] = useState('1000');
  const [paymentMethod, setPaymentMethod] =
    useState<BinanceP2PPaymentIdentifier>('PagoMovil');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { status, result, error, loading, search, refresh } =
    useBinanceP2POffers();

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountMinor = parseAmountToMinor(amount);

    if (
      amountMinor === null ||
      amountMinor < BINANCE_P2P_MIN_AMOUNT_MINOR ||
      amountMinor > BINANCE_P2P_MAX_AMOUNT_MINOR
    ) {
      setValidationError(
        `Ingrese un monto entre Bs. ${formatMinorUnits(BINANCE_P2P_MIN_AMOUNT_MINOR)} y Bs. ${formatMinorUnits(BINANCE_P2P_MAX_AMOUNT_MINOR)}.`
      );
      return;
    }

    setValidationError(null);
    const query: BinanceP2POffersQuery = {
      side,
      amountMinor,
      paymentMethod,
    };
    void search(query);
  };

  const searchedPaymentLabel = result
    ? BINANCE_P2P_PAYMENT_LABELS[result.query.paymentMethod]
    : null;
  const hasOffers =
    result !== null &&
    (status === 'live' || status === 'stale') &&
    result.offers.length > 0;

  return (
    <section
      data-testid="binance-offers-explorer"
      aria-labelledby="binance-p2p-title"
      aria-busy={loading}
      className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-ios-sm"
    >
      <div className="border-b border-border/40 bg-gradient-to-br from-amber-500/10 via-card to-card px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
              Mercado público
            </div>
            <h3
              id="binance-p2p-title"
              className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              Ofertas P2P de USDT
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Compare comerciantes según el monto y el método de pago que
              necesita.
            </p>
          </div>

          {result !== null && status !== 'loading' ? (
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Actualizar la última búsqueda"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <form onSubmit={submitSearch} className="space-y-5 px-4 py-5 sm:px-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">
            ¿Qué desea hacer?
          </legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1.5">
            <button
              type="button"
              data-testid="binance-offers-side-buy"
              aria-pressed={side === 'BUY'}
              onClick={() => setSide('BUY')}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                side === 'BUY'
                  ? 'bg-success-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
              }`}
            >
              Comprar USDT
            </button>
            <button
              type="button"
              data-testid="binance-offers-side-sell"
              aria-pressed={side === 'SELL'}
              onClick={() => setSide('SELL')}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                side === 'SELL'
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
              }`}
            >
              Vender USDT
            </button>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="binance-offers-amount"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Monto en VES
            </label>
            <div className="relative">
              <input
                id="binance-offers-amount"
                data-testid="binance-offers-amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={validationError !== null}
                aria-describedby="binance-offers-amount-help"
                className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 pr-14 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="1.000,00"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-muted-foreground">
                VES
              </span>
            </div>
            <p
              id="binance-offers-amount-help"
              className={`mt-1.5 text-xs ${validationError ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {validationError ?? 'Puede usar coma o punto para los decimales.'}
            </p>
          </div>

          <div>
            <label
              htmlFor="binance-offers-payment"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              Método de pago
            </label>
            <div className="relative">
              <Landmark
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                id="binance-offers-payment"
                data-testid="binance-offers-payment"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as BinanceP2PPaymentIdentifier
                  )
                }
                className="min-h-[44px] w-full appearance-none rounded-2xl border border-border bg-background py-2 pl-11 pr-9 text-[16px] text-foreground outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <optgroup label="Métodos principales">
                  {primaryPaymentMethods.map((identifier) => (
                    <option key={identifier} value={identifier}>
                      {BINANCE_P2P_PAYMENT_LABELS[identifier]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bancos venezolanos verificados">
                  {bankPaymentMethods.map((identifier) => (
                    <option key={identifier} value={identifier}>
                      {BINANCE_P2P_PAYMENT_LABELS[identifier]}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          data-testid="binance-offers-search"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-bold text-background transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          {loading ? 'Buscando ofertas...' : 'Buscar ofertas'}
        </button>
      </form>

      <div className="border-t border-border/40 bg-muted/10 px-4 py-5 sm:px-6">
        {status === 'idle' ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center">
            <Search
              className="mx-auto mb-3 h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground">
              Configure los filtros y busque ofertas públicas.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              La búsqueda solo se ejecuta cuando usted la solicita.
            </p>
          </div>
        ) : null}

        {status === 'loading' ? (
          <div
            role="status"
            aria-label="Buscando ofertas"
            className="space-y-3"
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-border/50 bg-muted/50"
              />
            ))}
          </div>
        ) : null}

        {status === 'unavailable' ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Ofertas no disponibles
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error ??
                    'No fue posible consultar las ofertas en este momento.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'empty' && result !== null ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-7 text-center">
            <p className="text-sm font-semibold text-foreground">
              No se encontraron ofertas para estos filtros.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pruebe otro monto o método de pago.
            </p>
          </div>
        ) : null}

        {status === 'stale' ? (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
          >
            <Clock3
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <p className="text-amber-900 dark:text-amber-100">
              Binance no respondió. Se muestran resultados recientes almacenados
              para esta búsqueda; verifique su vigencia antes de continuar.
            </p>
          </div>
        ) : null}

        {result !== null && (status === 'live' || status === 'stale') ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              {result.offers.length} ofertas para Bs.{' '}
              {formatMinorUnits(result.query.amountMinor)} ·{' '}
              {searchedPaymentLabel}
            </p>
            {result.fetchedAt ? (
              <time dateTime={result.fetchedAt}>
                Consulta:{' '}
                {new Date(result.fetchedAt).toLocaleTimeString('es-VE')}
              </time>
            ) : null}
          </div>
        ) : null}

        {status === 'stale' && result?.offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            No hay ofertas almacenadas para mostrar.
          </div>
        ) : null}

        {hasOffers && result !== null ? (
          <ol aria-label="Ofertas P2P" className="space-y-3">
            {result.offers.map((offer) => (
              <li
                key={offer.id}
                className="grid gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-amber-500/30 sm:grid-cols-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-800 dark:text-amber-200">
                      {offer.merchant.nickname.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {offer.merchant.nickname}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {offer.merchant.monthOrderCount.toLocaleString('es-VE')}{' '}
                        órdenes ·{' '}
                        {formatBasisPoints(
                          offer.merchant.monthCompletionRateBps
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Precio
                    </p>
                    <p className="text-2xl font-black tracking-tight text-foreground">
                      Bs. {formatMinorUnits(offer.priceMinor)}
                    </p>
                    <p className="text-xs text-muted-foreground">por USDT</p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-4">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Disponible
                      </dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {formatExactDecimal(offer.availableQuantity.value)} USDT
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Límites</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        Bs. {formatMinorUnits(offer.minFiatMinor)} - Bs.{' '}
                        {formatMinorUnits(offer.maxFiatMinor)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-1.5">
                    {offer.paymentMethods.map((method) => (
                      <span
                        key={method.identifier}
                        className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success-700 dark:text-success-300"
                      >
                        {method.name}
                      </span>
                    ))}
                    {offer.payTimeLimitMinutes !== null ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        {offer.payTimeLimitMinutes} min
                      </span>
                    ) : null}
                  </div>

                  <a
                    href={BINANCE_P2P_MARKET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-100"
                  >
                    Continuar en Binance
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="flex items-start gap-3 border-t border-border/40 bg-background/60 px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-6">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <p>
          Estas son ofertas públicas de Binance P2P. Los precios, límites y la
          disponibilidad pueden cambiar; verifique todos los datos nuevamente en
          Binance antes de continuar. FinTec no procesa la operación.
        </p>
      </div>
    </section>
  );
}

export const BinanceRatesComponent = memo(BinanceRatesComponentImpl);

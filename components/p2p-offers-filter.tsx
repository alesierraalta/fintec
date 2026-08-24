'use client';

import React, { useState } from 'react';
import {
  buildBinanceP2PTradeUrl,
  BINANCE_P2P_AMOUNT_UNITS,
  BINANCE_P2P_PAYMENT_IDENTIFIERS,
  BINANCE_P2P_PAYMENT_LABELS,
  BinanceP2PPaymentIdentifier,
  BinanceP2PAmountUnit,
  BinanceP2POffersQuery,
  BinanceP2PSide,
} from '@/types/binance-p2p-offers';
import { useBinanceP2POffers } from '@/hooks/use-binance-p2p-offers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BinanceMarketLink } from '@/components/p2p-offers/binance-market-link';
import { formatCurrency } from '@/lib/money';
import {
  ArrowRightLeft,
  ChevronDown,
  Clock3,
  DollarSign,
  ExternalLink,
  Info,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface FilterState {
  tradeType: BinanceP2PSide;
  amount: number | null;
  amountUnit: BinanceP2PAmountUnit;
  payType: BinanceP2PPaymentIdentifier;
  minCompletionRate: number | null;
  minOrderCount: number | null;
}

function formatVes(amountMinor: number): string {
  return formatCurrency(amountMinor, 'VES', {
    showSymbol: false,
    showCode: false,
  });
}

function formatQuantity(value: string): string {
  const [whole, fraction] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

function formatCompletionRate(bps: number | null): string {
  if (bps === null || bps === 0) return '—';
  return `${(bps / 100).toLocaleString('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export default function P2POffersFilter() {
  const [filterState, setFilterState] = useState<FilterState>({
    tradeType: 'BUY',
    amount: null,
    amountUnit: 'VES',
    payType: 'ALL',
    minCompletionRate: null,
    minOrderCount: null,
  });

  const { status, result, error, retryAfterSeconds, loading, search } =
    useBinanceP2POffers();

  const handleSearch = () => {
    const query: BinanceP2POffersQuery = {
      side: filterState.tradeType,
      amountMinor: filterState.amount
        ? Math.round(filterState.amount * 100)
        : 0,
      amountUnit: filterState.amountUnit,
      paymentMethod: filterState.payType,
      minCompletionRateBps:
        filterState.minCompletionRate === null
          ? 0
          : Math.round(filterState.minCompletionRate * 100),
      minOrderCount: filterState.minOrderCount ?? 0,
    };
    search(query);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFilterState((prev) => ({ ...prev, amount: null }));
    } else {
      setFilterState((prev) => ({ ...prev, amount: parseFloat(val) }));
    }
  };

  const isBuy = filterState.tradeType === 'BUY';
  const hasOffers =
    !loading &&
    (status === 'live' || status === 'stale') &&
    !!result &&
    result.offers.length > 0;
  const paymentLabel = result
    ? BINANCE_P2P_PAYMENT_LABELS[result.query.paymentMethod]
    : null;

  return (
    <div className="space-y-5">
      {/* Filter toolbar */}
      <section
        aria-label="Filtros de búsqueda"
        className="rounded-2xl border border-border/50 bg-card/80 p-3 shadow-ios-sm sm:p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Operación"
            className="grid w-full shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1 sm:w-auto"
          >
            <button
              type="button"
              aria-pressed={filterState.tradeType === 'BUY'}
              onClick={() =>
                setFilterState((prev) => ({ ...prev, tradeType: 'BUY' }))
              }
              className={`focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                isBuy
                  ? 'bg-success-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              Comprar USDT
            </button>
            <button
              type="button"
              aria-pressed={filterState.tradeType === 'SELL'}
              onClick={() =>
                setFilterState((prev) => ({ ...prev, tradeType: 'SELL' }))
              }
              className={`focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                !isBuy
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              Vender USDT
            </button>
          </div>

          <div
            role="group"
            aria-label="Unidad de cantidad"
            className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1"
          >
            {BINANCE_P2P_AMOUNT_UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={filterState.amountUnit === unit}
                onClick={() =>
                  setFilterState((prev) => ({ ...prev, amountUnit: unit }))
                }
                className={`focus-ring min-h-[44px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  filterState.amountUnit === unit
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>

          <div className="relative w-full shrink-0 sm:w-[180px]">
            <DollarSign
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              name="amount"
              type="number"
              min={filterState.amountUnit === 'USDT' ? '0.01' : '1'}
              step="0.01"
              placeholder={
                filterState.amountUnit === 'USDT' ? 'Ej. 10…' : 'Ej. 1000…'
              }
              aria-label={`Cantidad en ${filterState.amountUnit}`}
              inputMode="decimal"
              autoComplete="off"
              value={filterState.amount === null ? '' : filterState.amount}
              onChange={handleAmountChange}
              className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="relative w-full shrink-0 sm:w-[210px]">
            <Wallet
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              value={filterState.payType}
              onChange={(e) =>
                setFilterState((prev) => ({
                  ...prev,
                  payType: e.target.value as BinanceP2PPaymentIdentifier,
                }))
              }
              aria-label="Método de pago"
              className="h-12 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-8 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {BINANCE_P2P_PAYMENT_IDENTIFIERS.map((id) => (
                <option key={id} value={id}>
                  {BINANCE_P2P_PAYMENT_LABELS[id]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-[280px]">
            <input
              name="minCompletionRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Comp. ≥ %"
              aria-label="Completados mínimo en porcentaje"
              inputMode="decimal"
              autoComplete="off"
              value={
                filterState.minCompletionRate === null
                  ? ''
                  : filterState.minCompletionRate
              }
              onChange={(event) =>
                setFilterState((prev) => ({
                  ...prev,
                  minCompletionRate:
                    event.target.value === ''
                      ? null
                      : parseFloat(event.target.value),
                }))
              }
              className="h-12 min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <input
              name="minOrderCount"
              type="number"
              min="0"
              step="1"
              placeholder="Órdenes ≥"
              aria-label="Órdenes mínimas del vendedor"
              inputMode="numeric"
              autoComplete="off"
              value={
                filterState.minOrderCount === null
                  ? ''
                  : filterState.minOrderCount
              }
              onChange={(event) =>
                setFilterState((prev) => ({
                  ...prev,
                  minOrderCount:
                    event.target.value === ''
                      ? null
                      : parseInt(event.target.value, 10),
                }))
              }
              className="h-12 min-w-0 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            type="button"
            onClick={handleSearch}
            loading={loading}
            disabled={loading}
            size="md"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            className="w-full shrink-0 sm:w-auto"
          >
            {loading ? 'Buscando…' : 'Buscar ofertas'}
          </Button>
        </div>
      </section>

      {/* Context / status strip */}
      {hasOffers && result && (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                status === 'live' ? 'animate-pulse bg-success' : 'bg-warning'
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {result.offers.length} oferta
              {result.offers.length !== 1 ? 's' : ''} ·{' '}
              {isBuy ? 'Comprar' : 'Vender'} USDT · {paymentLabel}
            </span>
          </div>
          {result.fetchedAt ? (
            <time dateTime={result.fetchedAt} className="tabular-nums">
              {status === 'stale' ? 'Datos recientes · ' : 'Actualizado '}
              {new Date(result.fetchedAt).toLocaleTimeString('es-VE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          ) : null}
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading && (
          <div
            role="status"
            aria-label="Obteniendo ofertas de Binance"
            className="space-y-3"
          >
            <span className="sr-only">Obteniendo ofertas de Binance…</span>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-border/50 bg-muted/40"
              />
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-5"
          >
            <div className="flex items-start gap-3">
              <Info
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No se pudo consultar el mercado
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                {retryAfterSeconds && (
                  <p className="mt-1 text-sm text-destructive">
                    Por favor, espera {retryAfterSeconds} segundos.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && status === 'idle' && (
          <Card className="border-dashed p-6 text-center">
            <Search
              className="mx-auto mb-3 h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="font-medium text-foreground">
              Configura tus filtros y consulta el mercado
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Selecciona la operación, el monto y el método de pago, luego pulsa
              “Buscar ofertas”.
            </p>
          </Card>
        )}

        {!loading && status === 'stale' && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-warning-700 dark:text-warning-300"
          >
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Binance no respondió. Se muestran datos recientes almacenados;
              verifica su vigencia antes de continuar.
            </p>
          </div>
        )}

        {!loading && status === 'empty' && (
          <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">
              No se encontraron ofertas
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Intenta cambiar los filtros o el monto ingresado.
            </p>
          </div>
        )}

        {hasOffers && result ? (
          <ol aria-label="Ofertas P2P disponibles" className="space-y-3">
            {result.offers.map((offer) => (
              <li key={offer.id}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                  <div className="shrink-0 sm:w-40">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Precio por USDT
                    </p>
                    <p className="amount-emphasis-main mt-1 text-2xl tracking-tight">
                      Bs. {formatVes(offer.priceMinor)}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {offer.merchant.nickname.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {offer.merchant.nickname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {offer.merchant.monthOrderCount.toLocaleString(
                            'es-VE'
                          )}{' '}
                          órdenes ·{' '}
                          {formatCompletionRate(
                            offer.merchant.monthCompletionRateBps
                          )}{' '}
                          comp.
                        </p>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">
                          Límites
                        </dt>
                        <dd className="mt-0.5 min-w-0 font-medium tabular-nums text-foreground">
                          Bs. {formatVes(offer.minFiatMinor)} – Bs.{' '}
                          {formatVes(offer.maxFiatMinor)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">
                          Disponible
                        </dt>
                        <dd className="mt-0.5 min-w-0 font-medium tabular-nums text-foreground">
                          {formatQuantity(offer.availableQuantity.value)} USDT
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {offer.paymentMethods.map((pm) => (
                        <span
                          key={pm.identifier}
                          className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success-700 dark:text-success-300"
                        >
                          {pm.name}
                        </span>
                      ))}
                      {offer.payTimeLimitMinutes !== null &&
                        offer.payTimeLimitMinutes !== undefined && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <Clock3 className="h-3 w-3" aria-hidden="true" />
                            {offer.payTimeLimitMinutes} min
                          </span>
                        )}
                    </div>
                  </div>

                  <BinanceMarketLink
                    href={buildBinanceP2PTradeUrl(offer.merchant.userNo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`focus-ring flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors sm:w-auto ${
                      isBuy
                        ? 'bg-success-600 hover:bg-success-700'
                        : 'bg-destructive hover:bg-destructive/90'
                    }`}
                  >
                    {isBuy ? 'Comprar USDT' : 'Vender USDT'}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </BinanceMarketLink>
                </Card>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        Ofertas públicas de Binance P2P. Los precios, límites y la
        disponibilidad pueden cambiar; verifica todos los datos en Binance antes
        de continuar. FinTec no procesa la operación.
      </p>
    </div>
  );
}

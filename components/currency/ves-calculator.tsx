'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  ArrowUpDown,
  Clock,
  DollarSign,
  Euro,
  Calendar,
  Search,
} from 'lucide-react';
import type { BCVHistoryRecord } from '@/lib/services/bcv-history-service';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import type { BinanceHistoryRecord } from '@/lib/services/binance-history-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';
import { formatCaracasDayKey } from '@/lib/utils/date-key';
import { logger } from '@/lib/utils/logger';

export type VesCalculatorCurrency = 'VES' | 'USD' | 'EUR' | 'BUSD';
export type VesCalculatorSource = 'BCV' | 'Binance';

export interface VesCalculatorProps {
  bcvRates?: BCVHistoryRecord[];
  binanceRates?: BinanceHistoryRecord[];
  selectedBCVRate: BCVHistoryRecord | null;
  selectedBinanceRate: BinanceHistoryRecord | null;
  activeSource: VesCalculatorSource;
  onSourceChange?: (source: VesCalculatorSource) => void;
  onSelectBCVRate?: (rate: BCVHistoryRecord) => void;
  onSelectBinanceRate?: (rate: BinanceHistoryRecord) => void;
  onPickDate?: (dateStr: string, source: VesCalculatorSource) => Promise<void>;
  minDate?: string;
  maxDate?: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// * Currencies each rate source can actually convert. The dropdowns only ever
// offer these, so an unsupported pair can no longer be selected.
const SOURCE_CURRENCIES: Record<VesCalculatorSource, VesCalculatorCurrency[]> =
  {
    BCV: ['USD', 'VES', 'EUR'],
    Binance: ['USD', 'VES', 'BUSD'],
  };

// * USD and BUSD are dollar-equivalents: converting one into the other through
// a VES rate is meaningless, so that pair is never offered under Binance.
const DOLLAR_TWINS: VesCalculatorCurrency[] = ['USD', 'BUSD'];

function toOptionsFor(
  source: VesCalculatorSource,
  from: VesCalculatorCurrency
): VesCalculatorCurrency[] {
  const pool = SOURCE_CURRENCIES[source].filter((c) => c !== from);
  if (source === 'Binance' && DOLLAR_TWINS.includes(from)) {
    return pool.filter((c) => !DOLLAR_TWINS.includes(c));
  }
  return pool;
}

/**
 * Converts between currencies using the selected source's rate.
 * Returns null when the pair/rate combination has no real conversion,
 * instead of silently echoing the input back.
 */
function convertAmount(
  numAmount: number,
  from: VesCalculatorCurrency,
  to: VesCalculatorCurrency,
  source: VesCalculatorSource,
  bcvRate: BCVHistoryRecord | null,
  binanceRate: BinanceHistoryRecord | null
): number | null {
  if (from === to) return numAmount;

  if (source === 'BCV' && bcvRate) {
    switch (`${from}->${to}`) {
      case 'USD->VES':
        return numAmount * bcvRate.usd;
      case 'VES->USD':
        return numAmount / bcvRate.usd;
      case 'EUR->VES':
        return numAmount * bcvRate.eur;
      case 'VES->EUR':
        return numAmount / bcvRate.eur;
      case 'USD->EUR':
        return (numAmount * bcvRate.usd) / bcvRate.eur;
      case 'EUR->USD':
        return (numAmount * bcvRate.eur) / bcvRate.usd;
      default:
        return null;
    }
  }

  if (source === 'Binance' && binanceRate) {
    switch (`${from}->${to}`) {
      case 'USD->VES':
      case 'BUSD->VES':
        return numAmount * binanceRate.usd;
      case 'VES->USD':
      case 'VES->BUSD':
        return numAmount / binanceRate.usd;
      default:
        return null;
    }
  }

  return null;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VesCalculator({
  bcvRates = [],
  binanceRates = [],
  selectedBCVRate,
  selectedBinanceRate,
  activeSource,
  onSourceChange,
  onSelectBCVRate,
  onSelectBinanceRate,
  onPickDate,
  minDate,
  maxDate,
}: VesCalculatorProps) {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] =
    useState<VesCalculatorCurrency>('USD');
  const [toCurrency, setToCurrency] = useState<VesCalculatorCurrency>('VES');
  const [result, setResult] = useState<number | null>(null);
  const [vesDate, setVesDate] = useState('');
  const [vesMinDate, setVesMinDate] = useState('2023-01-01');
  const [vesMaxDate, setVesMaxDate] = useState(() =>
    formatCaracasDayKey(new Date())
  );
  const [vesMessage, setVesMessage] = useState<string | null>(null);
  const [vesError, setVesError] = useState<string | null>(null);
  const [vesSearching, setVesSearching] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const effectiveMinDate = minDate ?? vesMinDate;
  const effectiveMaxDate = maxDate ?? vesMaxDate;

  // * Keep the selected pair valid whenever the source or origin changes.
  // Unsupported currencies remap to sensible defaults instead of producing
  // fake identity results.
  useEffect(() => {
    const allowed = SOURCE_CURRENCIES[activeSource];
    const nextFrom = allowed.includes(fromCurrency) ? fromCurrency : 'USD';
    if (nextFrom !== fromCurrency) {
      setFromCurrency(nextFrom);
    }
    const options = toOptionsFor(activeSource, nextFrom);
    const nextTo =
      options.includes(toCurrency) && toCurrency !== nextFrom
        ? toCurrency
        : options[0];
    if (nextTo !== toCurrency) {
      setToCurrency(nextTo);
    }
  }, [activeSource, fromCurrency, toCurrency]);

  // Recalculate whenever dependencies change
  useEffect(() => {
    const bcvRate = activeSource === 'BCV' ? selectedBCVRate : null;
    const binanceRate = activeSource === 'Binance' ? selectedBinanceRate : null;
    const sanitized = amount.replace(',', '.');
    const numAmount = parseFloat(sanitized) || 0;
    setResult(
      convertAmount(
        numAmount,
        fromCurrency,
        toCurrency,
        activeSource,
        bcvRate,
        binanceRate
      )
    );
  }, [
    amount,
    fromCurrency,
    toCurrency,
    activeSource,
    selectedBCVRate,
    selectedBinanceRate,
  ]);

  useEffect(() => {
    if (minDate && maxDate) return;
    let cancelled = false;
    const compute = async () => {
      try {
        const todayStr = formatCaracasDayKey(new Date());
        if (!cancelled && !maxDate) setVesMaxDate(todayStr);
        const bcvAll = await (bcvHistoryService.getAllHistoricalRates?.() ??
          bcvHistoryService.getHistoricalRates(3650));
        const binanceAll = await ((
          binanceHistoryService as unknown as {
            getAllHistoricalRates?: () => Promise<BinanceHistoryRecord[]>;
          }
        ).getAllHistoricalRates?.() ??
          binanceHistoryService.getHistoricalRates(3650));
        const dates = [
          ...bcvAll.map((r) => r.date),
          ...binanceAll.map((r) => r.date),
        ]
          .filter(Boolean)
          .sort();
        if (!cancelled && dates.length > 0 && !minDate) {
          setVesMinDate(dates[0]);
        }
      } catch {}
    };
    void compute();
    return () => {
      cancelled = true;
    };
  }, [minDate, maxDate]);

  const handleAmountChange = (value: string) => {
    // Preserve trailing zero: type="text" inputMode="decimal"
    let sanitized = value.replace(/[^0-9.,]/g, '');
    // Normalize commas to dots and keep only first separator
    const dotNormalized = sanitized.replace(/,/g, '.');
    const parts = dotNormalized.split('.');
    let normalized = dotNormalized;
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
    }
    // Allow empty to clear
    if (value === '') {
      normalized = '';
    }
    setAmount(normalized);
  };

  const handleSwap = () => {
    const newFrom = toCurrency;
    const newTo = fromCurrency;
    setFromCurrency(newFrom);
    setToCurrency(newTo);
  };

  const handleSourceChange = (source: VesCalculatorSource) => {
    onSourceChange?.(source);
    // Pair normalization and recalculation happen in effects
  };

  const handleVesSearch = useCallback(async () => {
    const dateStr = vesDate.trim();
    setVesMessage(null);
    setVesError(null);
    if (!dateStr) {
      setVesError('Selecciona una fecha');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      setVesError('Formato inválido, usa YYYY-MM-DD');
      return;
    }
    if (dateStr < effectiveMinDate || dateStr > effectiveMaxDate) {
      setVesError(
        `Fecha fuera de rango (${effectiveMinDate} - ${effectiveMaxDate})`
      );
      return;
    }
    setVesSearching(true);
    try {
      if (onPickDate) {
        await onPickDate(dateStr, activeSource);
        // After delegated pick, infer fallback message by checking if selected rate matches
        // We don't have direct feedback, so we rely on parent to show message; show generic fallback if needed
        // Try to fetch again locally to decide message if parent didn't surface it
        if (activeSource === 'BCV') {
          const svc: unknown = bcvHistoryService;
          const getter =
            (
              svc as {
                getBCVRateOnOrBefore?: (
                  d: string
                ) => Promise<BCVHistoryRecord | null>;
              }
            ).getBCVRateOnOrBefore?.bind(svc as object) ??
            (
              svc as {
                getRatesForDate: (
                  d: string
                ) => Promise<BCVHistoryRecord | null>;
              }
            ).getRatesForDate.bind(svc as object);
          const rate = await getter(dateStr);
          if (rate && rate.date !== dateStr) {
            setVesMessage(
              'No hay tasa para ese día, se muestra la más cercana anterior'
            );
          }
        } else {
          const svc: unknown = binanceHistoryService;
          const getter =
            (
              svc as {
                getBinanceRateOnOrBefore?: (
                  d: string
                ) => Promise<BinanceHistoryRecord | null>;
              }
            ).getBinanceRateOnOrBefore?.bind(svc as object) ??
            (
              svc as {
                getBinanceRateForDate?: (
                  d: string
                ) => Promise<BinanceHistoryRecord | null>;
              }
            ).getBinanceRateForDate?.bind(svc as object) ??
            (
              svc as {
                getRatesForDate: (
                  d: string
                ) => Promise<BinanceHistoryRecord | null>;
              }
            ).getRatesForDate.bind(svc as object);
          const rate = await getter(dateStr);
          if (rate && rate.date !== dateStr) {
            setVesMessage(
              'No hay tasa para ese día, se muestra la más cercana anterior'
            );
          }
        }
        return;
      }
      if (activeSource === 'BCV') {
        const svc: unknown = bcvHistoryService;
        const getter =
          (
            svc as {
              getBCVRateOnOrBefore?: (
                d: string
              ) => Promise<BCVHistoryRecord | null>;
            }
          ).getBCVRateOnOrBefore?.bind(svc as object) ??
          (
            svc as {
              getRatesForDate: (d: string) => Promise<BCVHistoryRecord | null>;
            }
          ).getRatesForDate.bind(svc as object);
        const rate = await getter(dateStr);
        if (!rate) {
          setVesError('No hay tasa disponible para esa fecha');
          return;
        }
        if (rate.date !== dateStr) {
          setVesMessage(
            'No hay tasa para ese día, se muestra la más cercana anterior'
          );
        }
        onSelectBCVRate?.(rate);
      } else {
        const svc: unknown = binanceHistoryService;
        const getter =
          (
            svc as {
              getBinanceRateOnOrBefore?: (
                d: string
              ) => Promise<BinanceHistoryRecord | null>;
            }
          ).getBinanceRateOnOrBefore?.bind(svc as object) ??
          (
            svc as {
              getBinanceRateForDate?: (
                d: string
              ) => Promise<BinanceHistoryRecord | null>;
            }
          ).getBinanceRateForDate?.bind(svc as object) ??
          (
            svc as {
              getRatesForDate: (
                d: string
              ) => Promise<BinanceHistoryRecord | null>;
            }
          ).getRatesForDate.bind(svc as object);
        const rate = await getter(dateStr);
        if (!rate) {
          setVesError('No hay tasa disponible para esa fecha');
          return;
        }
        if (rate.date !== dateStr) {
          setVesMessage(
            'No hay tasa para ese día, se muestra la más cercana anterior'
          );
        }
        onSelectBinanceRate?.(rate);
      }
    } catch (error) {
      logger.error('[VesCalculator] Error buscando tasa por fecha', error);
      setVesError('Error al buscar la tasa');
    } finally {
      setVesSearching(false);
    }
  }, [
    vesDate,
    effectiveMinDate,
    effectiveMaxDate,
    onPickDate,
    activeSource,
    onSelectBCVRate,
    onSelectBinanceRate,
  ]);

  const selectedRate =
    activeSource === 'BCV' ? selectedBCVRate : selectedBinanceRate;
  const recentRates =
    activeSource === 'BCV' ? bcvRates.slice(0, 5) : binanceRates.slice(0, 5);

  // Unit rate for the context line: how much 1 `from` buys in `to`
  const unitRate =
    result !== null
      ? convertAmount(
          1,
          fromCurrency,
          toCurrency,
          activeSource,
          activeSource === 'BCV' ? selectedBCVRate : null,
          activeSource === 'Binance' ? selectedBinanceRate : null
        )
      : null;
  const sourceLabel =
    activeSource === 'BCV' ? 'Tasa oficial BCV' : 'Tasa de mercado Binance';

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Converter — the protagonist */}
      <div
        data-testid="converter-card"
        className="rounded-2xl border border-border/10 bg-muted/5 p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center space-x-2 text-lg font-medium text-foreground">
            <Calculator className="h-5 w-5" />
            <span>Calculadora de Conversión</span>
          </h3>

          {/* Applied rate toggle */}
          <div
            role="group"
            aria-label="Tasa aplicada a la conversión"
            className="flex space-x-1 rounded-lg bg-background p-1"
          >
            <button
              type="button"
              onClick={() => handleSourceChange('BCV')}
              aria-pressed={activeSource === 'BCV'}
              aria-label="Usar tasa BCV"
              className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeSource === 'BCV'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Oficial (BCV)
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange('Binance')}
              aria-pressed={activeSource === 'Binance'}
              aria-label="Usar tasa Binance"
              className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeSource === 'Binance'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mercado (Binance)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Amount Input - preserves trailing zero via type="text" */}
          <div>
            <label
              htmlFor="calculator-amount"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Cantidad
            </label>
            <input
              id="calculator-amount"
              data-testid="calculator-amount-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-border bg-background px-4 py-3 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa la cantidad"
              aria-label="Cantidad a convertir"
            />
          </div>

          {/* From / Swap / To */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="calculator-from"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                De
              </label>
              <select
                id="calculator-from"
                data-testid="from-currency"
                value={fromCurrency}
                onChange={(e) =>
                  setFromCurrency(e.target.value as VesCalculatorCurrency)
                }
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Moneda origen"
              >
                {SOURCE_CURRENCIES[activeSource].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              data-testid="swap-button"
              aria-label="Intercambiar monedas"
              onClick={handleSwap}
              className="mb-0.5 min-h-[44px] min-w-[44px] rounded-xl p-2 transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowUpDown className="mx-auto h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex-1">
              <label
                htmlFor="calculator-to"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                A
              </label>
              <select
                id="calculator-to"
                data-testid="to-currency"
                value={toCurrency}
                onChange={(e) =>
                  setToCurrency(e.target.value as VesCalculatorCurrency)
                }
                className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Moneda destino"
              >
                {toOptionsFor(activeSource, fromCurrency).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-center">
            <p className="mb-1 text-sm text-muted-foreground">Resultado</p>
            {result !== null ? (
              <p
                data-testid="calculator-result"
                aria-live="polite"
                className="text-2xl font-bold text-blue-500"
              >
                {result.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {toCurrency}
              </p>
            ) : (
              <p
                data-testid="calculator-result"
                aria-live="polite"
                className="text-2xl font-bold text-muted-foreground"
              >
                —
              </p>
            )}
            {result !== null && unitRate !== null && (
              <p
                data-testid="applied-rate-line"
                className="mt-2 text-xs text-muted-foreground"
              >
                1 {fromCurrency} ={' '}
                {unitRate.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}{' '}
                {toCurrency} · {sourceLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Applied rate details */}
      <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
        <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4" />
          <span>Tasa Aplicada</span>
        </h3>
        {activeSource === 'BCV' && selectedBCVRate ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedBCVRate.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(selectedBCVRate.timestamp)}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-sm font-medium">
                    {selectedBCVRate.usd.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    Bs
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Euro className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium">
                    {selectedBCVRate.eur.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    Bs
                  </span>
                </div>
              </div>
            </div>
            <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-500">
              Oficial
            </span>
          </div>
        ) : activeSource === 'Binance' && selectedBinanceRate ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedBinanceRate.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(selectedBinanceRate.timestamp)}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3 text-yellow-500" />
                <span className="text-sm font-medium">
                  {selectedBinanceRate.usd.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  Bs
                </span>
              </div>
            </div>
            <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">
              Mercado
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecciona una fecha del historial
          </p>
        )}
      </div>

      {/* Recent rates quick picker */}
      <div
        data-testid="rate-history-section"
        className="rounded-2xl border border-border/10 bg-muted/5 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            Tasas recientes
          </h4>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            aria-expanded={showPicker}
            aria-controls="ves-date-picker-section"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border/20 bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Calendar className="h-3 w-3" />
            {showPicker ? 'Ocultar' : 'Elegir otro día'}
          </button>
        </div>
        {recentRates.length > 0 && (onSelectBCVRate || onSelectBinanceRate) ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activeSource === 'BCV'
              ? (bcvRates.slice(0, 5) as BCVHistoryRecord[]).map((rate) => (
                  <button
                    key={rate.id ?? rate.date}
                    type="button"
                    onClick={() => onSelectBCVRate?.(rate)}
                    aria-label={`Seleccionar tasa BCV ${rate.date}`}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      selectedBCVRate?.date === rate.date
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-border/20 bg-background hover:bg-muted/20'
                    }`}
                  >
                    <span className="block font-medium">
                      {formatDate(rate.date)}
                    </span>
                    <span className="block text-muted-foreground">
                      {rate.usd.toFixed(2)} Bs
                    </span>
                  </button>
                ))
              : (binanceRates.slice(0, 5) as BinanceHistoryRecord[]).map(
                  (rate) => (
                    <button
                      key={rate.id ?? rate.date}
                      type="button"
                      onClick={() => onSelectBinanceRate?.(rate)}
                      aria-label={`Seleccionar tasa Binance ${rate.date}`}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        selectedBinanceRate?.date === rate.date
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                          : 'border-border/20 bg-background hover:bg-muted/20'
                      }`}
                    >
                      <span className="block font-medium">
                        {formatDate(rate.date)}
                      </span>
                      <span className="block text-muted-foreground">
                        {rate.usd.toFixed(2)} Bs
                      </span>
                    </button>
                  )
                )}
          </div>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">
            No hay tasas recientes, elige un día del historial completo.
          </p>
        )}

        {(showPicker || recentRates.length === 0) && (
          <div
            id="ves-date-picker-section"
            className="mt-3 rounded-xl border border-border/20 bg-card/60 p-3"
          >
            <label
              htmlFor="ves-history-date-picker"
              className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <Calendar className="h-3 w-3" />
              Elegir día del historial completo
            </label>
            <div className="flex gap-2">
              <input
                id="ves-history-date-picker"
                data-testid="ves-history-date-picker"
                type="date"
                aria-label="Elegir día del historial completo"
                value={vesDate}
                onChange={(e) => setVesDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleVesSearch();
                  }
                }}
                min={effectiveMinDate}
                max={effectiveMaxDate}
                className="flex-1 rounded-xl border border-border/20 bg-card/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                data-testid="ves-history-date-search"
                aria-label="Buscar tasa por fecha"
                onClick={() => void handleVesSearch()}
                disabled={vesSearching}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {vesSearching ? (
                  <Clock className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                <span>Buscar</span>
              </button>
            </div>
            {vesMessage && (
              <p
                role="status"
                aria-live="polite"
                className="mt-2 text-xs text-amber-600"
              >
                {vesMessage}
              </p>
            )}
            {vesError && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {vesError}
              </p>
            )}
          </div>
        )}
      </div>

      {!selectedRate && (
        <p className="text-center text-xs text-muted-foreground">
          Selecciona una tasa del historial para habilitar la conversión
        </p>
      )}
    </motion.div>
  );
}

export default VesCalculator;

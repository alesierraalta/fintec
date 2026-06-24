'use client';

import { memo, useCallback, useMemo, useState, type ChangeEvent } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  Minimize2,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import {
  KNOWN_BANKS,
  calculateAdjustedRate,
  SAFE_FALLBACK_RATE,
  type BankId,
  type Side,
} from '@/lib/binance-adjustment';

export type RateMode = 'simple' | 'full';

export interface BinanceRateAdvancedProps {
  snapshot: BinanceRatesSnapshot;
  mode: RateMode;
  onModeChange: (next: RateMode) => void;
}

const STATUS_CHIP = {
  live: {
    label: 'VIVO',
    className:
      'border-green-400 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    Icon: Activity,
  },
  fallback: {
    label: 'REFERENCIA',
    className:
      'border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  stale: {
    label: 'DESACT.',
    className:
      'border-warning-400 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    Icon: Clock,
  },
} as const;

const BANK_LABELS: Record<BankId, string> = {
  mercantil: 'Mercantil',
  banesco: 'Banesco',
  provincial: 'Provincial',
  paypal: 'PayPal',
  zelle: 'Zelle',
  other: 'Otro',
};

const FALLBACK_THRESHOLD_LOW = 7;
const FALLBACK_THRESHOLD_HIGH = 9;

function BinanceRateAdvancedImpl({
  snapshot,
  mode,
  onModeChange,
}: BinanceRateAdvancedProps) {
  const [side, setSide] = useState<Side>('SELL');
  const [bank, setBank] = useState<BankId>('mercantil');
  const [amountMajor, setAmountMajor] = useState<number>(100);

  const status = snapshot.status;
  const chip =
    STATUS_CHIP[status as keyof typeof STATUS_CHIP] ?? STATUS_CHIP.live;
  const ChipIcon = chip.Icon;

  // Use the safe base rate (770.00 fallback if snapshot is out of range).
  const rawAvg = snapshot.rates.sell_rate.avg;
  const useFallback =
    snapshot.isStale &&
    (rawAvg < FALLBACK_THRESHOLD_LOW || rawAvg > FALLBACK_THRESHOLD_HIGH);
  const baseRateMajor = useFallback ? SAFE_FALLBACK_RATE / 100 : rawAvg;
  const baseRateMinor = Math.round(baseRateMajor * 100);
  const amountMinor = Math.round(amountMajor * 100);

  // Adjusted rate uses the lib's pure calculation (basis points, integer math).
  const adjustedMinor = useMemo(
    () => calculateAdjustedRate(baseRateMinor, side, bank, amountMinor),
    [baseRateMinor, side, bank, amountMinor]
  );
  const adjustedMajor = (adjustedMinor / 100).toFixed(2);

  const handleSideChange = useCallback((next: Side) => setSide(next), []);
  const handleBankChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setBank(e.target.value as BankId),
    []
  );
  const handleAmountChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      setAmountMajor(Math.max(0, Number(e.target.value) || 0)),
    []
  );
  const handleToggle = useCallback(() => {
    onModeChange(mode === 'simple' ? 'full' : 'simple');
  }, [mode, onModeChange]);
  const handleRefresh = useCallback(() => {
    if (!snapshot.loading) void snapshot.refetch();
  }, [snapshot.loading, snapshot.refetch]);

  return (
    <div
      data-testid="binance-rate-advanced"
      className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl lg:p-8"
    >
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Binance P2P</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${chip.className}`}
            >
              <ChipIcon className="mr-1 h-3 w-3" />
              <span>{chip.label}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={snapshot.loading}
              aria-label="Actualizar"
              className="rounded-xl bg-muted/20 p-2 hover:bg-primary/10 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 text-muted-foreground ${snapshot.loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
        <button
          type="button"
          data-testid="binance-rate-mode-toggle"
          onClick={handleToggle}
          className="flex min-h-[40px] items-center justify-center space-x-2 self-end rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-500/20 dark:text-orange-300"
        >
          <Minimize2 className="h-3 w-3" />
          <span>Modo simple</span>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          data-testid="side-selector-buy"
          onClick={() => handleSideChange('BUY')}
          className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            side === 'BUY'
              ? 'border-green-500 bg-green-500/20 text-green-700 dark:text-green-300'
              : 'border-border/40 bg-muted/10 text-muted-foreground hover:bg-muted/20'
          }`}
        >
          COMPRA
        </button>
        <button
          type="button"
          data-testid="side-selector-sell"
          onClick={() => handleSideChange('SELL')}
          className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            side === 'SELL'
              ? 'border-red-500 bg-red-500/20 text-red-700 dark:text-red-300'
              : 'border-border/40 bg-muted/10 text-muted-foreground hover:bg-muted/20'
          }`}
        >
          VENTA
        </button>
        <select
          data-testid="bank-select"
          value={bank}
          onChange={handleBankChange}
          className="min-h-[44px] rounded-xl border border-border/40 bg-background px-3 py-2 text-sm"
        >
          {KNOWN_BANKS.map((b) => (
            <option key={b} value={b}>
              {BANK_LABELS[b]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          htmlFor="binance-amount"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Monto (USD)
        </label>
        <input
          id="binance-amount"
          data-testid="amount-input"
          type="number"
          min={0}
          step={1}
          value={amountMajor}
          onChange={handleAmountChange}
          className="min-h-[44px] w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-center backdrop-blur-sm">
        <p className="text-xs font-bold text-primary">💵 Tasa estimada</p>
        <p
          data-testid="binance-rate-adjusted"
          className="text-2xl font-bold text-primary sm:text-3xl"
        >
          Bs. {adjustedMajor}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {useFallback ? `Fallback 770.00 · ` : ''}Base{' '}
          {baseRateMajor.toFixed(2)} · {side} · {BANK_LABELS[bank]} ·{' '}
          {amountMajor} USD
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          data-testid="venta-block"
          className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/5 p-3"
        >
          <div className="mb-1 flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-foreground">VENTA</span>
          </div>
          <p className="text-lg font-semibold text-red-500">
            Bs. {snapshot.rates.sell_rate.avg.toFixed(2)}
          </p>
          <p className="text-[10px] text-red-400">
            {snapshot.rates.sell_prices_used} ofertas
          </p>
        </div>
        <div
          data-testid="compra-block"
          className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/5 p-3"
        >
          <div className="mb-1 flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-foreground">COMPRA</span>
          </div>
          <p className="text-lg font-semibold text-green-500">
            Bs. {snapshot.rates.buy_rate.avg.toFixed(2)}
          </p>
          <p className="text-[10px] text-green-400">
            {snapshot.rates.buy_prices_used} ofertas
          </p>
        </div>
      </div>
    </div>
  );
}

export const BinanceRateAdvanced = memo(BinanceRateAdvancedImpl);

'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Info } from 'lucide-react';
import { useBinanceP2PEstimate } from '@/hooks/use-binance-p2p-estimate';
import {
  formatRateHundredths,
  type AmountTier,
  type P2PSide,
  type PaymentMethod,
} from '@/lib/services/binance-p2p-estimator';

export interface BinanceEstimatorProps {
  /** Base rate in fixed-point hundredths (e.g. 79000 = 790.00 VES/USDT). */
  baseRateRaw: number;
}

const SIDE_OPTIONS: ReadonlyArray<{ value: P2PSide; label: string }> = [
  { value: 'BUY', label: 'Comprar USDT' },
  { value: 'SELL', label: 'Vender USDT' },
];

const PAYMENT_OPTIONS: ReadonlyArray<{ value: PaymentMethod; label: string }> =
  [
    { value: 'all', label: 'Todos' },
    { value: 'mercantil', label: 'Mercantil' },
    { value: 'banesco', label: 'Banesco' },
    { value: 'pago_movil', label: 'Pago Móvil' },
  ];

const AMOUNT_TIER_OPTIONS: ReadonlyArray<{ value: AmountTier; label: string }> =
  [
    { value: 'low', label: 'Menos de $100' },
    { value: 'medium', label: 'Entre $100 y $1,000' },
    { value: 'high', label: 'Más de $1,000' },
  ];

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export const BinanceEstimator = React.memo(function BinanceEstimator({
  baseRateRaw,
}: BinanceEstimatorProps) {
  const { state, estimate, setSide, setPaymentMethod, setAmountTier } =
    useBinanceP2PEstimate({ baseRateRaw, defaultAmountTier: 'medium' });
  const reactId = useId();
  const sideFieldId = `${reactId}-side`;
  const paymentFieldId = `${reactId}-payment`;
  const amountFieldId = `${reactId}-amount`;

  const formattedRate = formatRateHundredths(estimate.estimatedRateRaw);
  const formattedBase = formatRateHundredths(baseRateRaw);

  return (
    <motion.section
      aria-labelledby={`${reactId}-title`}
      className="mt-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 p-4 backdrop-blur-sm sm:p-5"
      variants={fadeInUp}
      initial="hidden"
      animate="show"
    >
      <div className="mb-3 flex items-center space-x-2">
        <Calculator className="h-4 w-4 text-orange-600" aria-hidden="true" />
        <h4
          id={`${reactId}-title`}
          className="text-ios-body font-medium text-foreground"
        >
          Simulador de tasa estimada
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={sideFieldId}
            className="text-ios-caption font-medium text-muted-foreground"
          >
            Operación
          </label>
          <select
            id={sideFieldId}
            value={state.side}
            onChange={(event) => setSide(event.target.value as P2PSide)}
            className="min-h-[44px] rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {SIDE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={paymentFieldId}
            className="text-ios-caption font-medium text-muted-foreground"
          >
            Método de pago
          </label>
          <select
            id={paymentFieldId}
            value={state.paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
            className="min-h-[44px] rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={amountFieldId}
            className="text-ios-caption font-medium text-muted-foreground"
          >
            Monto
          </label>
          <select
            id={amountFieldId}
            value={state.amountTier}
            onChange={(event) =>
              setAmountTier(event.target.value as AmountTier)
            }
            className="min-h-[44px] rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {AMOUNT_TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/20 bg-background/60 p-3">
        <p className="text-ios-caption text-muted-foreground">Tasa estimada</p>
        <p
          className="text-2xl font-bold text-primary sm:text-3xl"
          data-testid="binance-estimator-rate"
        >
          Bs.{' '}
          <span data-testid="binance-estimator-rate-value">
            {formattedRate}
          </span>
        </p>
        <p className="text-ios-caption text-muted-foreground">
          Base de referencia (promedio de venta Binance): Bs. {formattedBase}{' '}
          VES/USDT · {state.side === 'BUY' ? 'Comprar USDT' : 'Vender USDT'} ·{' '}
          {
            PAYMENT_OPTIONS.find((opt) => opt.value === state.paymentMethod)
              ?.label
          }{' '}
          ·{' '}
          {
            AMOUNT_TIER_OPTIONS.find((opt) => opt.value === state.amountTier)
              ?.label
          }
        </p>
      </div>

      <div
        role="note"
        aria-label="Aviso de estimación"
        className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-100/60 p-3 text-ios-footnote text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
      >
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <p>
          Esta tasa es una estimación basada en las tendencias del mercado de
          Binance P2P. El valor final depende de la oferta disponible al momento
          de operar y puede variar respecto a la estimación mostrada.
        </p>
      </div>
    </motion.section>
  );
});

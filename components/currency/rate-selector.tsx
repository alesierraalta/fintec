'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Banknote, Coins, DollarSign, Euro, ChevronDown } from 'lucide-react';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAppStore } from '@/lib/store';

type RateSource = 'binance' | 'bcv_usd' | 'bcv_eur';

export function RateSelector() {
  const [open, setOpen] = useState(false);
  const bcv = useBCVRates();
  const { rates: binance } = useBinanceRates();

  const selectedRateSource = useAppStore((s) => s.selectedRateSource);
  const setSelectedRateSource = useAppStore((s) => s.setSelectedRateSource);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [close]);

  const handleSelect = useCallback(
    (src: RateSource) => {
      setSelectedRateSource(src);
      close();
    },
    [setSelectedRateSource, close]
  );

  const triggerIcon = useMemo(() => {
    switch (selectedRateSource) {
      case 'binance':
        return <Coins className="h-4 w-4" />;
      case 'bcv_usd':
        return <DollarSign className="h-4 w-4" />;
      case 'bcv_eur':
        return <Euro className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  }, [selectedRateSource]);

  const binanceUsdVes = binance?.usd_ves ?? binance?.sell_rate?.avg ?? 0;
  const bcvUsd = bcv.usd;
  const bcvEur = bcv.eur;

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-ios"
        title="Seleccionar fuente de tasa"
      >
        {triggerIcon}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <>
          <div className="absolute left-0 top-full mt-2 w-56 black-theme-card rounded-xl shadow-2xl z-50 animate-scale-in">
            <div className="py-2">
              <button
                onClick={() => handleSelect('binance')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/10 ${
                  selectedRateSource === 'binance' ? 'bg-white/10' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Binance
                </span>
                <span className="text-xs text-text-muted">
                  {binanceUsdVes ? binanceUsdVes.toFixed(2) + ' VES' : '...'}
                </span>
              </button>

              <button
                onClick={() => handleSelect('bcv_usd')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/10 ${
                  selectedRateSource === 'bcv_usd' ? 'bg-white/10' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> BCV USD
                </span>
                <span className="text-xs text-text-muted">
                  {bcvUsd ? bcvUsd.toFixed(2) + ' VES' : '...'}
                </span>
              </button>

              <button
                onClick={() => handleSelect('bcv_eur')}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/10 ${
                  selectedRateSource === 'bcv_eur' ? 'bg-white/10' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <Euro className="h-4 w-4" /> BCV EUR
                </span>
                <span className="text-xs text-text-muted">
                  {bcvEur ? bcvEur.toFixed(2) + ' VES' : '...'}
                </span>
              </button>
            </div>
          </div>
          <div className="fixed inset-0 z-40" onClick={close} />
        </>
      )}
    </div>
  );
}

export default RateSelector;


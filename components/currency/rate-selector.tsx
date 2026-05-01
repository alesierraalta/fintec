'use client';

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type CSSProperties,
} from 'react';
import { Banknote, Coins, DollarSign, Euro, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAppStore } from '@/lib/store';

type RateSource = 'binance' | 'bcv_usd' | 'bcv_eur';

export function RateSelector() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedRateSource = useAppStore((s) => s.selectedRateSource);
  const setSelectedRateSource = useAppStore((s) => s.setSelectedRateSource);

  const shouldFetchBcv =
    open ||
    selectedRateSource === 'bcv_usd' ||
    selectedRateSource === 'bcv_eur';
  const shouldFetchBinance = open || selectedRateSource === 'binance';

  const bcv = useBCVRates({ enabled: shouldFetchBcv });
  const { rates: binance } = useBinanceRates({ enabled: shouldFetchBinance });

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  const overlayHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('modal-root') ?? document.body;
  }, []);

  const getViewportMetrics = useCallback(() => {
    const visualViewport = window.visualViewport;

    return {
      offsetLeft: visualViewport?.offsetLeft ?? 0,
      offsetTop: visualViewport?.offsetTop ?? 0,
      width: visualViewport?.width ?? window.innerWidth,
    };
  }, []);

  const syncMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const sideMargin = 12;
    const {
      offsetLeft,
      offsetTop,
      width: viewportWidth,
    } = getViewportMetrics();
    const clampedWidth = Math.min(
      224,
      Math.max(160, viewportWidth - sideMargin * 2)
    );
    const preferredLeft = rect.left + offsetLeft;
    const minLeft = offsetLeft + sideMargin;
    const maxLeft = offsetLeft + viewportWidth - clampedWidth - sideMargin;
    const safeMaxLeft = Math.max(minLeft, maxLeft);

    setMenuStyle({
      top: rect.bottom + 8 + offsetTop,
      left: Math.min(Math.max(preferredLeft, minLeft), safeMaxLeft),
      width: clampedWidth,
    });
  }, [getViewportMetrics]);

  useEffect(() => {
    if (!open) return;

    syncMenuPosition();
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);
    visualViewport?.addEventListener('resize', syncMenuPosition);
    visualViewport?.addEventListener('scroll', syncMenuPosition);

    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
      visualViewport?.removeEventListener('resize', syncMenuPosition);
      visualViewport?.removeEventListener('scroll', syncMenuPosition);
    };
  }, [open, syncMenuPosition]);

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
    <div className="relative flex min-w-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Seleccionar fuente de tasa"
        className="focus-ring transition-ios flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xl px-2 py-2 text-foreground/80 hover:bg-accent/10 hover:text-foreground sm:w-auto sm:max-w-none sm:justify-start"
        title="Seleccionar fuente de tasa"
      >
        {triggerIcon}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open &&
        overlayHost &&
        createPortal(
          <>
            <div
              className="ios-card fixed z-[55] w-56 animate-scale-in rounded-xl shadow-2xl"
              style={menuStyle ?? { top: '4.5rem', left: '1rem' }}
            >
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => handleSelect('binance')}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-foreground/5 ${
                    selectedRateSource === 'binance' ? 'bg-foreground/10' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Binance
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {binanceUsdVes ? binanceUsdVes.toFixed(2) + ' VES' : '...'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect('bcv_usd')}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-foreground/5 ${
                    selectedRateSource === 'bcv_usd' ? 'bg-foreground/10' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> BCV USD
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bcvUsd ? bcvUsd.toFixed(2) + ' VES' : '...'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect('bcv_eur')}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-foreground/5 ${
                    selectedRateSource === 'bcv_eur' ? 'bg-foreground/10' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Euro className="h-4 w-4" /> BCV EUR
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bcvEur ? bcvEur.toFixed(2) + ' VES' : '...'}
                  </span>
                </button>
              </div>
            </div>
            <div
              data-overlay-backdrop="rate-selector"
              className="fixed inset-0 z-[54]"
              onClick={close}
            />
          </>,
          overlayHost
        )}
    </div>
  );
}

export default RateSelector;

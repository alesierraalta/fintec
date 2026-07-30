import { useState, useEffect } from 'react';
import type { Transaction } from '@/types/domain';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';

export interface VesRates {
  dateLabel: string;
  isFallbackDate: boolean;
  bcvDateLabel?: string;
  binanceDateLabel?: string;
  bcvUsd: number | null;
  bcvEur: number | null;
  binanceUsd: number | null;
  equivalentUsdBcv: string | null;
  equivalentEurBcv: string | null;
  equivalentUsdBinance: string | null;
  todayLabel?: string;
  todayBcvUsd?: number | null;
  todayBcvEur?: number | null;
  todayBinanceUsd?: number | null;
  todayEquivalentUsdBcv?: string | null;
  todayEquivalentEurBcv?: string | null;
  todayEquivalentUsdBinance?: string | null;
}

export function useHistoricalRates(transaction: Transaction, isOpen: boolean) {
  const [vesRates, setVesRates] = useState<VesRates | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!isOpen || transaction.currencyCode !== 'VES') {
      setVesRates(null);
      return;
    }

    async function loadRates() {
      // Extract date from transaction (YYYY-MM-DD or ISO string)
      const txDate = transaction.date.split('T')[0];
      const toDateLabel = (d: string) => {
        const parts = d.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
      };

      try {
        // Query historical rates (with automatic fallback to nearest prior date)
        const bcvRecord = await bcvHistoryService.getRatesForDate(txDate);
        const binanceRecord =
          await binanceHistoryService.getRatesForDate(txDate);

        // Query today's rates for comparison if the transaction date is not today
        const todayDate = new Date().toISOString().split('T')[0];
        const needsToday = txDate !== todayDate;
        let todayBcvRecord = null;
        let todayBinanceRecord = null;
        if (needsToday) {
          todayBcvRecord = await bcvHistoryService.getRatesForDate(todayDate);
          todayBinanceRecord =
            await binanceHistoryService.getRatesForDate(todayDate);
        }

        if (!isMounted) return;

        const amountInBs =
          transaction.amountMinor && !isNaN(transaction.amountMinor)
            ? Math.abs(transaction.amountMinor) / 100 // Convert from minor units (céntimos)
            : 0;

        const bcvUsd = bcvRecord?.usd ?? null;
        const bcvEur = bcvRecord?.eur ?? null;
        const binanceUsd = binanceRecord?.usd ?? null;

        // Determine the overall actual rate date for the header
        const actualRateDate = bcvRecord?.date ?? binanceRecord?.date ?? txDate;
        const isFallbackDate = actualRateDate !== txDate;
        const dateLabel = toDateLabel(actualRateDate);

        // Determine specific fallback labels if they differ from the txDate
        const bcvDateLabel =
          bcvRecord?.date && bcvRecord.date !== txDate
            ? toDateLabel(bcvRecord.date)
            : undefined;
        const binanceDateLabel =
          binanceRecord?.date && binanceRecord.date !== txDate
            ? toDateLabel(binanceRecord.date)
            : undefined;

        setVesRates({
          dateLabel,
          isFallbackDate,
          bcvDateLabel,
          binanceDateLabel,
          bcvUsd,
          bcvEur,
          binanceUsd,
          equivalentUsdBcv:
            bcvUsd && amountInBs > 0 ? (amountInBs / bcvUsd).toFixed(2) : null,
          equivalentEurBcv:
            bcvEur && amountInBs > 0 ? (amountInBs / bcvEur).toFixed(2) : null,
          equivalentUsdBinance:
            binanceUsd && amountInBs > 0
              ? (amountInBs / binanceUsd).toFixed(2)
              : null,
          todayLabel: needsToday ? toDateLabel(todayDate) : undefined,
          todayBcvUsd: todayBcvRecord?.usd ?? null,
          todayBcvEur: todayBcvRecord?.eur ?? null,
          todayBinanceUsd: todayBinanceRecord?.usd ?? null,
          todayEquivalentUsdBcv:
            todayBcvRecord?.usd && amountInBs > 0
              ? (amountInBs / todayBcvRecord.usd).toFixed(2)
              : null,
          todayEquivalentEurBcv:
            todayBcvRecord?.eur && amountInBs > 0
              ? (amountInBs / todayBcvRecord.eur).toFixed(2)
              : null,
          todayEquivalentUsdBinance:
            todayBinanceRecord?.usd && amountInBs > 0
              ? (amountInBs / todayBinanceRecord.usd).toFixed(2)
              : null,
        });
      } catch (error) {
        console.error('[useHistoricalRates] failed to load rates:', error);
        // On failure, keep displaying null rates but don't crash
      }
    }

    loadRates();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    transaction.currencyCode,
    transaction.date,
    transaction.amountMinor,
  ]);

  return { vesRates };
}

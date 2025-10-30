import { useAppStore } from '@/lib/store';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';

// Returns active USD/VES rate based on selected source.
// Note: when 'bcv_eur' is selected, we still convert VES→USD using BCV USD
// to keep totals in USD consistent across the app per decision A/A.
export function useActiveUsdVesRate(): number {
  const source = useAppStore((s) => s.selectedRateSource);
  const bcv = useBCVRates();
  const { rates: binance } = useBinanceRates();

  if (source === 'binance') {
    return binance?.usd_ves ?? binance?.sell_rate?.avg ?? 0;
  }
  if (source === 'bcv_usd') {
    return bcv.usd || 0;
  }
  if (source === 'bcv_eur') {
    return bcv.usd || 0;
  }
  return 0;
}



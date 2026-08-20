// Currency display policy: the user-facing contract that separates
// transaction-time historical amounts from current-rate live projections and
// prevents fabricated monetary values (e.g. presenting missing data as 0,00).
//
// This is a narrow display DTO consumed by existing screens — NOT a unified
// financial service. Each component/hook supplies the facts; this module only
// classifies, formats, and discloses provenance.

import { formatCurrency } from './money';

export type DisplayMoneyFreshness = 'fresh' | 'stale';

export type DisplayMoneyDTO =
  | { kind: 'historical'; amountBaseMinor: number; currencyCode: string }
  | {
      kind: 'live';
      amountMinor: number;
      currencyCode: string;
      rate: number;
      source: string;
      observedAt: string;
      freshness: DisplayMoneyFreshness;
    }
  | {
      kind: 'unavailable';
      reason: 'pending' | 'missing-amount' | 'missing-rate';
    };

export interface DisplayMoney {
  text: string;
  kind: DisplayMoneyDTO['kind'];
  isUnavailable: boolean;
  /** Present only for `live` values: source + freshness disclosure. */
  provenance?: string;
}

const UNAVAILABLE_LABEL: Record<
  'pending' | 'missing-amount' | 'missing-rate',
  string
> = {
  pending: 'Pendiente',
  'missing-amount': 'Sin datos',
  'missing-rate': 'Sin tasa',
};

/**
 * Render a DisplayMoneyDTO to a user-facing string plus classification flags.
 * The conversion itself is performed by the caller (historical base amount or
 * live projected amount); this function only labels and formats it honestly.
 */
export function formatDisplayMoney(
  dto: DisplayMoneyDTO,
  options?: { locale?: string }
): DisplayMoney {
  if (dto.kind === 'historical') {
    return {
      text: formatCurrency(dto.amountBaseMinor, dto.currencyCode, {
        locale: options?.locale,
      }),
      kind: 'historical',
      isUnavailable: false,
    };
  }

  if (dto.kind === 'live') {
    const text = formatCurrency(dto.amountMinor, dto.currencyCode, {
      locale: options?.locale,
    });
    const rateLabel = Number.isFinite(dto.rate) ? ` ${dto.rate}` : '';
    const freshnessLabel =
      dto.freshness === 'fresh' ? 'actualizado' : 'desactualizado';
    const provenance = `${dto.source}${rateLabel} · ${freshnessLabel}`;
    return { text, kind: 'live', isUnavailable: false, provenance };
  }

  return {
    text: UNAVAILABLE_LABEL[dto.reason],
    kind: 'unavailable',
    isUnavailable: true,
  };
}

// --- Constructors (reduce ad-hoc object literals at call sites) ---

export function historicalMoney(
  amountBaseMinor: number,
  currencyCode: string
): DisplayMoneyDTO {
  return { kind: 'historical', amountBaseMinor, currencyCode };
}

export function liveMoney(params: {
  amountMinor: number;
  currencyCode: string;
  rate: number;
  source: string;
  observedAt: string;
  freshness: DisplayMoneyFreshness;
}): DisplayMoneyDTO {
  return { kind: 'live', ...params };
}

export function unavailableMoney(
  reason: 'pending' | 'missing-amount' | 'missing-rate'
): DisplayMoneyDTO {
  return { kind: 'unavailable', reason };
}

/**
 * Derive freshness from an observed-at timestamp. Missing or unparseable
 * timestamps are treated as stale so a missing rate is never implied current.
 */
export function deriveFreshness(
  observedAt: string | undefined,
  now: number,
  maxAgeMs = 1000 * 60 * 60
): DisplayMoneyFreshness {
  if (!observedAt) return 'stale';
  const ts = new Date(observedAt).getTime();
  if (!Number.isFinite(ts)) return 'stale';
  return now - ts <= maxAgeMs ? 'fresh' : 'stale';
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  BinanceP2POffersQuery,
  BinanceP2POffersResult,
  BinanceP2POffersStatus,
} from '@/types/binance-p2p-offers';

type BinanceP2POffersClientStatus = 'idle' | 'loading' | BinanceP2POffersStatus;

function isOffersResult(value: unknown): value is BinanceP2POffersResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BinanceP2POffersResult>;
  return (
    ['live', 'empty', 'stale', 'unavailable'].includes(
      candidate.status ?? ''
    ) &&
    typeof candidate.query === 'object' &&
    candidate.query !== null &&
    Array.isArray(candidate.offers) &&
    (typeof candidate.fetchedAt === 'string' || candidate.fetchedAt === null)
  );
}

export function useBinanceP2POffers() {
  const [status, setStatus] = useState<BinanceP2POffersClientStatus>('idle');
  const [result, setResult] = useState<BinanceP2POffersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(
    null
  );
  const controllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<BinanceP2POffersQuery | null>(null);

  const search = useCallback(async (query: BinanceP2POffersQuery) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastQueryRef.current = query;
    setStatus('loading');
    setResult(null);
    setError(null);
    setRetryAfterSeconds(null);

    try {
      const response = await fetch('/api/binance-p2p-offers', {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }

      if (isOffersResult(payload)) {
        setResult(payload);
        setStatus(payload.status);
        if (payload.status === 'unavailable') {
          setError('No fue posible consultar las ofertas en este momento.');
        }
        return;
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const boundedRetryAfter =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.ceil(retryAfter)
            : null;
        setRetryAfterSeconds(boundedRetryAfter);
        throw new Error(
          boundedRetryAfter
            ? `Espere ${boundedRetryAfter} segundos antes de buscar nuevamente.`
            : 'Ha realizado demasiadas búsquedas. Intente nuevamente más tarde.'
        );
      }

      throw new Error('No fue posible consultar las ofertas en este momento.');
    } catch (requestError) {
      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }

      setStatus('unavailable');
      setResult(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible consultar las ofertas en este momento.'
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastQueryRef.current) await search(lastQueryRef.current);
  }, [search]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  return {
    status,
    result,
    error,
    retryAfterSeconds,
    loading: status === 'loading',
    search,
    refresh,
  };
}

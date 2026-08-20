'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

type UseUnreadPollingOptions<T> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  intervalMs?: number;
  enabled?: boolean;
  onNew?: (newItems: T extends (infer U)[] ? U[] : never) => void;
};

export function useUnreadPolling<T>({
  queryKey,
  queryFn,
  intervalMs = 45_000,
  enabled = true,
  onNew,
}: UseUnreadPollingOptions<T>) {
  const prevIds = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey,
    queryFn,
    refetchInterval: intervalMs,
    enabled,
  });

  useEffect(() => {
    const data = query.data as unknown;
    if (!Array.isArray(data)) return;
    const fresh = data as { id: string }[];
    if (prevIds.current.size > 0 && fresh.length > 0) {
      const newItems = fresh.filter((item) => !prevIds.current.has(item.id));
      if (newItems.length > 0) {
        (onNew as (items: typeof newItems) => void)?.(newItems as never);
      }
    }
    prevIds.current = new Set(fresh.map((i) => i.id));
  }, [query.data, onNew]);

  return query;
}

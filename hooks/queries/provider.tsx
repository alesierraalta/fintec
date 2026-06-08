'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryClientProvider wrapper component.
 *
 * Creates a QueryClient with sensible defaults for the app:
 * - staleTime: 2 minutes (transactions default)
 * - refetchOnWindowFocus: false (reduces unnecessary requests)
 * - retry: 1 (quick retry on failure)
 *
 * Uses useState to ensure QueryClient is created once per component tree
 * (avoids re-creating on every render in development).
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

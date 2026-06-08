/**
 * Task 2.10: useAccounts React Query Hook
 *
 * Tests for the useAccounts hook that wraps React Query.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useAccounts', () => {
  it('should export useAccounts from the hook file', async () => {
    const mod = await import('@/hooks/queries/use-accounts');
    expect(mod.useAccounts).toBeDefined();
    expect(typeof mod.useAccounts).toBe('function');
  });

  it('should return loading state initially', async () => {
    const { useAccounts } = await import('@/hooks/queries/use-accounts');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAccounts(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch accounts successfully', async () => {
    const { useAccounts } = await import('@/hooks/queries/use-accounts');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});

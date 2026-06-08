/**
 * Task 2.9: useTransactions React Query Hook
 *
 * Tests for the useTransactions hook that wraps React Query.
 * Uses TDD: write failing tests first, then implement.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useTransactions', () => {
  it('should export useTransactions from the hook file', async () => {
    const mod = await import('@/hooks/queries/use-transactions');
    expect(mod.useTransactions).toBeDefined();
    expect(typeof mod.useTransactions).toBe('function');
  });

  it('should return loading state initially', async () => {
    const { useTransactions } = await import('@/hooks/queries/use-transactions');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch transactions successfully', async () => {
    const { useTransactions } = await import('@/hooks/queries/use-transactions');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have data (empty array from mock)
    expect(result.current.data).toBeDefined();
  });
});

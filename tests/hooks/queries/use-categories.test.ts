/**
 * Task 2.11: useCategories React Query Hook
 *
 * Tests for the useCategories hook that wraps React Query.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

describe('useCategories', () => {
  it('should export useCategories from the hook file', async () => {
    const mod = await import('@/hooks/queries/use-categories');
    expect(mod.useCategories).toBeDefined();
    expect(typeof mod.useCategories).toBe('function');
  });

  it('should return loading state initially', async () => {
    const { useCategories } = await import('@/hooks/queries/use-categories');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCategories(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch categories successfully', async () => {
    const { useCategories } = await import('@/hooks/queries/use-categories');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});

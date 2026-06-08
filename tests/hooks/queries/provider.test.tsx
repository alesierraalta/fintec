/**
 * Task 2.13: QueryClientProvider Wrapper
 *
 * Tests for the QueryClientProvider wrapper component
 * that provides React Query context to the app.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

describe('QueryClientProvider wrapper', () => {
  it('should export QueryProvider from the file', async () => {
    const mod = await import('@/hooks/queries/provider');
    expect(mod.QueryProvider).toBeDefined();
    expect(typeof mod.QueryProvider).toBe('function');
  });

  it('should render children inside provider', async () => {
    const { QueryProvider } = await import('@/hooks/queries/provider');

    render(
      <QueryProvider>
        <div data-testid="test-child">Test Child</div>
      </QueryProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should provide QueryClient context to children', async () => {
    const { QueryProvider } = await import('@/hooks/queries/provider');
    const { useQueryClient } = await import('@tanstack/react-query');

    function TestComponent() {
      const queryClient = useQueryClient();
      return <div data-testid="query-client">{queryClient ? 'has-client' : 'no-client'}</div>;
    }

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByTestId('query-client')).toHaveTextContent('has-client');
  });
});

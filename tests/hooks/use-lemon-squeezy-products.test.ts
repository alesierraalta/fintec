/**
 * Tests for useLemonSqueezyProducts hook
 * 
 * This test ensures that the hook correctly fetches and parses
 * Lemon Squeezy product data for the pricing page
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useLemonSqueezyProducts } from '@/hooks/use-lemon-squeezy-products';

// Mock fetch
global.fetch = jest.fn();

describe('useLemonSqueezyProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch products successfully', async () => {
    const mockProducts = {
      products: [
        {
          id: '656807',
          type: 'products',
          attributes: {
            store_id: 229057,
            name: 'Plan Full',
            slug: 'plan-full',
            description: 'Test description',
            status: 'published',
            price: 599,
            price_formatted: '$5.99/month',
            buy_now_url: 'https://test.com',
            created_at: '2025-10-09T10:59:18.000000Z',
            updated_at: '2025-10-09T10:59:55.000000Z',
            test_mode: true,
          },
          variants: [
            {
              id: '1031352',
              type: 'variants',
              attributes: {
                price: 599,
                is_subscription: true,
                interval: 'month' as const,
                interval_count: 1,
                has_free_trial: true,
                trial_interval: 'day',
                trial_interval_count: 14,
                product_id: 656807,
                name: 'Default',
                slug: 'test-slug',
                description: '',
                status: 'pending',
                test_mode: true,
              },
            },
          ],
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    });

    const { result } = renderHook(() => useLemonSqueezyProducts());

    expect(result.current.loading).toBe(true);
    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual(mockProducts.products);
    expect(result.current.error).toBe(null);
    expect(global.fetch).toHaveBeenCalledWith('/api/lemonsqueezy/products');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useLemonSqueezyProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch products');
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useLemonSqueezyProducts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });
});


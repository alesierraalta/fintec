import { useEffect, useState } from 'react';

export interface LemonSqueezyVariant {
  id: string;
  type: string;
  attributes: {
    price: number;
    is_subscription: boolean;
    interval: 'month' | 'year';
    interval_count: number;
    has_free_trial: boolean;
    trial_interval: string;
    trial_interval_count: number;
    product_id: number;
    name: string;
    slug: string;
    description: string;
    status: string;
    test_mode: boolean;
  };
}

export interface LemonSqueezyProduct {
  id: string;
  type: string;
  attributes: {
    store_id: number;
    name: string;
    slug: string;
    description: string;
    status: string;
    price: number;
    price_formatted: string;
    buy_now_url: string;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
  variants: LemonSqueezyVariant[];
}

export interface LemonSqueezyProductsResponse {
  products: LemonSqueezyProduct[];
}

/**
 * Hook to fetch Lemon Squeezy products and variants
 * Used to dynamically populate the pricing page
 */
export function useLemonSqueezyProducts() {
  const [products, setProducts] = useState<LemonSqueezyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/lemonsqueezy/products');
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data: LemonSqueezyProductsResponse = await response.json();
        setProducts(data.products);
      } catch (err) {
        console.error('Error fetching Lemon Squeezy products:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}


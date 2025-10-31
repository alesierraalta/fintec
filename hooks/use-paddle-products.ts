import { useEffect, useState } from 'react';

export interface PaddlePrice {
  id: string;
  type: string;
  product_id: string;
  description: string;
  price_type: 'standard' | 'custom';
  billing_cycle?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
  trial_period?: {
    interval: 'day' | 'week' | 'month' | 'year';
    frequency: number;
  };
  tax_mode: 'account_setting' | 'external' | 'internal';
  unit_price: {
    amount: string;
    currency_code: string;
  };
  unit_price_overrides?: Array<{
    country_codes: string[];
    unit_price: {
      amount: string;
      currency_code: string;
    };
  }>;
  quantity?: {
    minimum: number;
    maximum?: number;
  };
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PaddleProduct {
  id: string;
  type: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  image_url?: string;
  custom_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  prices: PaddlePrice[];
}

export interface PaddleProductsResponse {
  products: PaddleProduct[];
}

/**
 * Hook to fetch Paddle products and prices
 * Used to dynamically populate the pricing page
 */
export function usePaddleProducts() {
  const [products, setProducts] = useState<PaddleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/paddle/products');
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data: PaddleProductsResponse = await response.json();
        setProducts(data.products);
      } catch (err) {
        console.error('Error fetching Paddle products:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}


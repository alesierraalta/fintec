import { NextRequest, NextResponse } from 'next/server';
import { getLemonSqueezyHeaders } from '@/lib/lemonsqueezy/config';

/**
 * GET /api/lemonsqueezy/products
 * 
 * Fetches all products and their variants from Lemon Squeezy
 * This endpoint is used to dynamically populate the pricing page
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all products
    const productsResponse = await fetch(
      'https://api.lemonsqueezy.com/v1/products',
      {
        headers: getLemonSqueezyHeaders(),
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!productsResponse.ok) {
      throw new Error('Failed to fetch products from Lemon Squeezy');
    }

    const productsData = await productsResponse.json();
    const products = productsData.data;

    // Fetch variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product: any) => {
        const variantsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/products/${product.id}/variants`,
          {
            headers: getLemonSqueezyHeaders(),
            next: { revalidate: 3600 },
          }
        );

        if (!variantsResponse.ok) {
          console.error(`Failed to fetch variants for product ${product.id}`);
          return {
            ...product,
            variants: [],
          };
        }

        const variantsData = await variantsResponse.json();
        return {
          ...product,
          variants: variantsData.data,
        };
      })
    );

    return NextResponse.json({
      products: productsWithVariants,
    });
  } catch (error) {
    console.error('Error fetching Lemon Squeezy products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}


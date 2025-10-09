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
    // Validate configuration before making API calls
    const headers = getLemonSqueezyHeaders();
    const apiKey = headers['Authorization']?.replace('Bearer ', '');
    
    if (!apiKey || apiKey === 'undefined' || apiKey.length === 0) {
      console.error('[LemonSqueezy] Missing or invalid API key');
      return NextResponse.json(
        { 
          error: 'LemonSqueezy API not configured. Please check LEMONSQUEEZY_API_KEY environment variable.',
          details: 'API key is missing or empty'
        },
        { status: 500 }
      );
    }

    console.log('[LemonSqueezy] Fetching products from API...');
    
    // Fetch all products
    const productsResponse = await fetch(
      'https://api.lemonsqueezy.com/v1/products',
      {
        headers,
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!productsResponse.ok) {
      const errorText = await productsResponse.text();
      console.error('[LemonSqueezy] Failed to fetch products:', {
        status: productsResponse.status,
        statusText: productsResponse.statusText,
        response: errorText,
        url: 'https://api.lemonsqueezy.com/v1/products'
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch products from Lemon Squeezy',
          details: {
            status: productsResponse.status,
            statusText: productsResponse.statusText,
            message: errorText
          }
        },
        { status: productsResponse.status }
      );
    }

    const productsData = await productsResponse.json();
    const products = productsData.data;

    console.log(`[LemonSqueezy] Found ${products?.length || 0} products`);

    // Fetch variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product: any) => {
        const variantsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/products/${product.id}/variants`,
          {
            headers,
            next: { revalidate: 3600 },
          }
        );

        if (!variantsResponse.ok) {
          const errorText = await variantsResponse.text();
          console.error(`[LemonSqueezy] Failed to fetch variants for product ${product.id}:`, {
            status: variantsResponse.status,
            statusText: variantsResponse.statusText,
            response: errorText
          });
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

    console.log('[LemonSqueezy] Successfully fetched all products with variants');
    
    return NextResponse.json({
      products: productsWithVariants,
    });
  } catch (error) {
    console.error('[LemonSqueezy] Unexpected error fetching products:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


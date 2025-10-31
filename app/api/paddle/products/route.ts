import { NextRequest, NextResponse } from 'next/server';
import { getPaddleHeaders, paddleConfig } from '@/lib/paddle/config';

/**
 * GET /api/paddle/products
 * 
 * Fetches all products and their prices from Paddle
 * Used by the pricing page to display current pricing
 */
export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    if (!paddleConfig.apiKey || paddleConfig.apiKey.length === 0) {
      return NextResponse.json(
        {
          error: 'Paddle API not configured. Please check PADDLE_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    const headers = getPaddleHeaders();

    // Fetch products from Paddle API
    try {
      // Paddle API uses https://api.paddle.com/v1/products (v1 API)
      // Or use the SDK: paddleClient.products.list()
      const productsResponse = await fetch(
        'https://api.paddle.com/products',
        {
          method: 'GET',
          headers,
        }
      );

      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        throw new Error(
          `Failed to fetch products from Paddle: ${productsResponse.status} - ${errorText}`
        );
      }

      const productsData = await productsResponse.json();

      // Fetch prices for each product
      const productsWithPrices = await Promise.all(
        productsData.data.map(async (product: any) => {
          try {
            const pricesResponse = await fetch(
              `https://api.paddle.com/prices?product_id=${product.id}`,
              {
                method: 'GET',
                headers,
              }
            );

            if (pricesResponse.ok) {
              const pricesData = await pricesResponse.json();
              return {
                ...product,
                prices: pricesData.data || [],
              };
            }
            return { ...product, prices: [] };
          } catch (priceError) {
            console.error(
              `Error fetching prices for product ${product.id}:`,
              priceError
            );
            return { ...product, prices: [] };
          }
        })
      );

      return NextResponse.json({
        products: productsWithPrices,
      });
    } catch (apiError: any) {
      return NextResponse.json(
        {
          error: 'Failed to fetch products from Paddle',
          details: apiError?.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}


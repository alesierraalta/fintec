/**
 * PagoFlash Payment Provider
 * Documentation: https://www.postman.com/pagoflash/workspace/pagoflash-pasarela-de-pagos/overview
 */

const BASE_URL = process.env.PAGOFLASH_BASE_URL || 'https://pagoflash.com/payment-gateway-commerce';

export interface PagoFlashOrderRequest {
  amount: number;
  description: string;
  orderId: string;
  payerEmail: string;
  payerName?: string;
  successRedirectUrl: string;
  errorRedirectUrl: string;
}

export interface PagoFlashOrderResponse {
  success: boolean;
  result?: {
    url: string;
    id: string;
    code: string;
  };
  error?: string;
}

/**
 * Creates a payment order in PagoFlash and returns the gateway URL
 */
export async function createPagoFlashOrder(
  data: PagoFlashOrderRequest
): Promise<PagoFlashOrderResponse> {
  try {
    const token = process.env.PAGOFLASH_BEARER_TOKEN;
    if (!token) {
      throw new Error('PAGOFLASH_BEARER_TOKEN is not configured');
    }

    const response = await fetch(`${BASE_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        payeeWallets: [], // Required by API
      }),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('[PagoFlash] Error creating order:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

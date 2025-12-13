export const lemonSqueezyConfig = {
  apiKey: process.env.LEMONSQUEEZY_API_KEY || 'mock-api-key',
  storeId: process.env.LEMONSQUEEZY_STORE_ID || 'mock-store-id',
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
};

export function validateLemonSqueezyConfig(): boolean {
  return !!lemonSqueezyConfig.apiKey && !!lemonSqueezyConfig.storeId;
}

export function getLemonSqueezyHeaders(): Record<string, string> {
  return {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${lemonSqueezyConfig.apiKey}`,
  };
}

/**
 * LemonSqueezy Configuration Tests
 * 
 * These tests validate that the LemonSqueezy API configuration is correct
 * and that the API connection is working properly.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { getLemonSqueezyHeaders, validateLemonSqueezyConfig, lemonSqueezyConfig } from '@/lib/lemonsqueezy/config';

describe('LemonSqueezy Configuration', () => {
  describe('validateLemonSqueezyConfig', () => {
    it('should validate that required config values are present', () => {
      const isValid = validateLemonSqueezyConfig();
      
      // Log the configuration state for debugging
      console.log('[LemonSqueezy Config Test] Configuration validation:', {
        isValid,
        hasApiKey: !!lemonSqueezyConfig.apiKey,
        hasStoreId: !!lemonSqueezyConfig.storeId,
        apiKeyLength: lemonSqueezyConfig.apiKey?.length || 0,
        storeIdLength: lemonSqueezyConfig.storeId?.length || 0,
      });
      
      // This test will help identify if env vars are missing
      if (!isValid) {
        console.error('[LemonSqueezy Config Test] CONFIGURATION ERROR:');
        if (!lemonSqueezyConfig.apiKey || lemonSqueezyConfig.apiKey.length === 0) {
          console.error('  - LEMONSQUEEZY_API_KEY is missing or empty');
        }
        if (!lemonSqueezyConfig.storeId || lemonSqueezyConfig.storeId.length === 0) {
          console.error('  - LEMONSQUEEZY_STORE_ID is missing or empty');
        }
      }
      
      expect(isValid).toBe(true);
    });
  });

  describe('getLemonSqueezyHeaders', () => {
    it('should return correct headers structure', () => {
      const headers = getLemonSqueezyHeaders();
      
      expect(headers).toHaveProperty('Accept');
      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('Authorization');
      
      expect(headers['Accept']).toBe('application/vnd.api+json');
      expect(headers['Content-Type']).toBe('application/vnd.api+json');
    });

    it('should include API key in Authorization header', () => {
      const headers = getLemonSqueezyHeaders();
      
      expect(headers['Authorization']).toMatch(/^Bearer .+/);
      
      const apiKey = headers['Authorization'].replace('Bearer ', '');
      
      console.log('[LemonSqueezy Config Test] API Key validation:', {
        hasApiKey: apiKey.length > 0,
        apiKeyFormat: apiKey !== 'undefined' && apiKey !== '' ? 'valid' : 'invalid',
        apiKeyLength: apiKey.length
      });
      
      expect(apiKey).not.toBe('');
      expect(apiKey).not.toBe('undefined');
      expect(apiKey.length).toBeGreaterThan(0);
    });
  });

  describe('LemonSqueezy API Connection', () => {
    it('should successfully connect to LemonSqueezy API', async () => {
      // Skip this test if config is not valid
      if (!validateLemonSqueezyConfig()) {
        console.warn('[LemonSqueezy Config Test] Skipping API connection test - configuration invalid');
        return;
      }

      const headers = getLemonSqueezyHeaders();
      
      try {
        const response = await fetch('https://api.lemonsqueezy.com/v1/products', {
          headers,
          method: 'GET'
        });

        console.log('[LemonSqueezy Config Test] API Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        // If we get a 401, the API key is invalid
        if (response.status === 401) {
          const errorText = await response.text();
          console.error('[LemonSqueezy Config Test] Authentication failed:', {
            status: 401,
            response: errorText
          });
          throw new Error('Invalid API key - please check LEMONSQUEEZY_API_KEY');
        }

        // If we get a 404, the store might not exist or products endpoint is wrong
        if (response.status === 404) {
          const errorText = await response.text();
          console.error('[LemonSqueezy Config Test] Not found:', {
            status: 404,
            response: errorText
          });
          throw new Error('Products endpoint not found - check store configuration');
        }

        // Any other error
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[LemonSqueezy Config Test] API Error:', {
            status: response.status,
            statusText: response.statusText,
            response: errorText
          });
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('[LemonSqueezy Config Test] API Success:', {
          hasData: !!data,
          productCount: data.data?.length || 0
        });

        expect(data).toBeDefined();
        expect(data.data).toBeDefined();
        
      } catch (error) {
        console.error('[LemonSqueezy Config Test] Exception during API call:', error);
        throw error;
      }
    }, 15000); // 15 second timeout for API call
  });
});

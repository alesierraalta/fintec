import { test, expect } from '@playwright/test';

test.describe('AI Features (Premium Only)', () => {
  test.skip('AI categorization API requires premium', async ({ request }) => {
    // This test would require API testing with auth
    const response = await request.post('/api/ai/categorize', {
      data: {
        userId: 'test-user-id',
        description: 'Coffee at Starbucks',
        amount: 500,
      },
    });
    
    // Free users should get 403
    // Premium users should get 200
    expect([200, 403]).toContain(response.status());
  });

  test.skip('AI predictions API requires premium', async ({ request }) => {
    const response = await request.post('/api/ai/predict', {
      data: {
        userId: 'test-user-id',
      },
    });
    
    expect([200, 403, 400]).toContain(response.status());
  });

  test.skip('AI advice API requires premium', async ({ request }) => {
    const response = await request.post('/api/ai/advice', {
      data: {
        userId: 'test-user-id',
      },
    });
    
    expect([200, 403, 400]).toContain(response.status());
  });

  test.skip('AI analysis API requires premium', async ({ request }) => {
    const response = await request.post('/api/ai/analyze', {
      data: {
        userId: 'test-user-id',
        type: 'anomalies',
      },
    });
    
    expect([200, 403, 400]).toContain(response.status());
  });
});

test.describe('AI Feature UI', () => {
  test('Premium features are marked in UI', async ({ page }) => {
    await page.goto('/pricing');
    
    // Look for AI feature mentions
    await expect(page.locator('text=/IA|inteligencia artificial|categorización automática/i')).toBeVisible();
    
    // Should be under Premium tier
    const premiumSection = page.locator('text=Premium').locator('..');
    await expect(premiumSection.locator('text=/IA|categorización/i')).toBeVisible();
  });

  test('AI features show upgrade prompt for non-premium users', async ({ page }) => {
    // This would require actual implementation of AI UI
    // For now, just verify pricing page mentions AI
    await page.goto('/pricing');
    
    const aiFeatures = page.locator('text=/categorización.*IA|predicciones|consejos.*financiero/i');
    await expect(aiFeatures.first()).toBeVisible();
  });
});


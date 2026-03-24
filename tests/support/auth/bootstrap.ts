import { expect, type Page } from '@playwright/test';

interface CanonicalBootstrapEntity {
  id: string;
  name: string;
  currencyCode?: string;
  kind?: string;
}

interface CanonicalBootstrapCreatedState {
  account: boolean;
  incomeCategory: boolean;
  expenseCategory: boolean;
}

interface CanonicalBootstrapProfile {
  email: string;
  displayName: string;
  baseCurrency: string;
}

export interface CanonicalBootstrapResult {
  account: CanonicalBootstrapEntity;
  incomeCategory: CanonicalBootstrapEntity;
  expenseCategory: CanonicalBootstrapEntity;
  created: CanonicalBootstrapCreatedState;
  profile: CanonicalBootstrapProfile;
}

interface CanonicalBootstrapResponse {
  success: boolean;
  data?: CanonicalBootstrapResult;
  error?: string;
}

export async function bootstrapCanonicalFixtures(
  page: Pick<Page, 'request'>
): Promise<CanonicalBootstrapResult> {
  const response = await page.request.post('/api/testing/bootstrap');
  const payload = (await response.json()) as CanonicalBootstrapResponse;

  if (!response.ok()) {
    throw new Error(payload.error ?? 'Bootstrap request failed');
  }

  expect(payload.success).toBe(true);
  expect(payload.data).toBeDefined();

  return payload.data as CanonicalBootstrapResult;
}

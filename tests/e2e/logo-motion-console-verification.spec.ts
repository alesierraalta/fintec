import { expect, test } from '@playwright/test';

const noAuthLane = (process.env.PLAYWRIGHT_LANE ?? 'no-auth') === 'no-auth';

function collectRelevantWarnings(messages: string[]): string[] {
  return messages.filter((message) => {
    const normalized = message.toLowerCase();
    return (
      (normalized.includes('/finteclogodark.jpg') &&
        normalized.includes('width') &&
        normalized.includes('height')) ||
      normalized.includes('reduced-motion') ||
      normalized.includes('reducedmotion')
    );
  });
}

test.describe('Logo and motion console verification', () => {
  test.skip(!noAuthLane, 'Runs only in no-auth Playwright lane.');

  test('landing route stays free of logo dimension and reduced-motion warnings', async ({
    page,
  }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/landing');
    await expect(page).toHaveURL(/\/landing$/);
    await expect(
      page.locator('img[src*="finteclogodark.jpg"]').first()
    ).toBeVisible();

    const relevant = collectRelevantWarnings(consoleMessages);
    expect(relevant).toEqual([]);
  });

  test('waitlist route stays free of logo dimension and reduced-motion warnings', async ({
    page,
  }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/waitlist');
    await expect(page).toHaveURL(/\/waitlist$/);
    await expect(
      page.locator('img[src*="finteclogodark.jpg"]').first()
    ).toBeVisible();

    const relevant = collectRelevantWarnings(consoleMessages);
    expect(relevant).toEqual([]);
  });
});

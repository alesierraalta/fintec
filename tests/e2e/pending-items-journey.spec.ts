import { test, expect, type Page } from '@playwright/test';
import dotenv from 'dotenv';

// Playwright's Node process does not load Next's env files; the GoTrue seed
// needs the same URL/anon key the browser app gets.
dotenv.config({ path: '.env.local' });

/**
 * Real-run journey for /pending (test-plan-pending-items, L5 · real-run-validation).
 *
 * Run:
 *   NEXT_PUBLIC_DB_PROVIDER=local npm run e2e:no-auth -- tests/e2e/pending-items-journey.spec.ts --project=chromium
 *
 * - Data lives in real Dexie (IndexedDB) inside the test browser profile:
 *   zero writes reach the Supabase remote. The guard below refuses to run
 *   the spec against any other provider.
 * - Auth is stubbed at the network edge only: the GoTrue session is seeded
 *   in the exact cookie format `@supabase/ssr` persists (base64url JSON
 *   under `sb-<ref>-auth-token`), and the two endpoints the frontend calls
 *   (`GET /auth/v1/user`, `GET /rest/v1/users`) are served by the route
 *   stubs. No app internals are monkey-patched; everything below the auth
 *   edge (repositories, Dexie, forms) runs for real.
 */

const requiresLocalProvider = process.env.NEXT_PUBLIC_DB_PROVIDER !== 'local';

const BYPASS_USER = {
  id: '00000000-0000-4000-8000-00000000e2e1',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'pending-e2e@fintec.local',
  email_confirmed_at: '2026-01-01T00:00:00.000000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Pending E2E' },
  identities: [],
  created_at: '2026-01-01T00:00:00.000000Z',
  updated_at: '2026-01-01T00:00:00.000000Z',
} as const;

// Far-future expiry (year 2100) so the client never attempts a refresh.
const SESSION = {
  access_token: 'e2e-seeded-access-token',
  refresh_token: 'e2e-seeded-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: BYPASS_USER,
} as const;

function encodeGoTrueCookie(payload: unknown): string {
  // @supabase/ssr stores `base64-` + base64url(bytes) of the JSON value.
  const base64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64'
  );
  return `base64-${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const projectRef = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
const authTokenCookieName = `sb-${projectRef}-auth-token`;

async function seedGoTrueSession(page: Page): Promise<void> {
  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is required to seed the GoTrue session'
    );
  }

  // Seed the session before any app script runs: the GoTrue client
  // rehydrates it on construction exactly as it would a real login.
  await page.addInitScript(
    ([cookieName, cookieValue]) => {
      document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=34560000; samesite=lax`;
    },
    [authTokenCookieName, encodeGoTrueCookie(SESSION)]
  );

  // Network edge stubs (the real auth server is never contacted):
  await page.route('**/auth/v1/user**', (route) =>
    route.fulfill({ status: 200, json: BYPASS_USER })
  );
  await page.route('**/rest/v1/users**', (route) =>
    route.fulfill({
      status: 200,
      json: [{ id: BYPASS_USER.id, base_currency: 'USD' }],
    })
  );
}

function purchasesSection(page: Page) {
  return page
    .getByRole('heading', { name: 'Compras pendientes' })
    .locator('xpath=ancestor::section[1]');
}

test.describe('Pending items journey', () => {
  test.skip(
    requiresLocalProvider,
    'Run with NEXT_PUBLIC_DB_PROVIDER=local (npm run e2e:no-auth -- tests/e2e/pending-items-journey.spec.ts): the journey must write to Dexie, never to the remote Supabase.'
  );

  test.setTimeout(120_000);

  test('alta con importe es-ES → toggle → conversión → limpiar', async ({
    page,
  }) => {
    await seedGoTrueSession(page);
    await page.goto('/pending');

    // The two checklists really render.
    await expect(
      page.getByRole('heading', { name: 'Compras pendientes' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pagos pendientes' })
    ).toBeVisible();

    // 1) Alta con importe: "1.234" en es-ES son 1234 USD. CLDR es-ES usa
    // minimumGroupingDigits=2: 1234 se muestra sin separador (~$1234,00).
    const purchases = purchasesSection(page);
    await purchases
      .getByLabel('Agregar a Compras pendientes')
      .fill('Café del journey');
    await purchases.getByLabel('Importe aproximado (opcional)').fill('1.234');
    await purchases
      .getByRole('button', { name: 'Añadir a Compras pendientes' })
      .click();

    await expect(purchases.getByText('Café del journey')).toBeVisible();
    await expect(purchases.getByText('~$1234,00')).toBeVisible();

    // 2) Toggle done con un toque.
    await purchases
      .getByRole('button', {
        name: 'Marcar "Café del journey" como comprado',
      })
      .click();
    await expect(purchases.getByText(/Completados \(\d+\)/)).toBeVisible();

    // 3) Conversión: el modal abre con el nombre e importe prefijados.
    await purchases
      .getByRole('button', {
        name: 'Registrar "Café del journey" como transacción',
      })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Descripción')).toHaveValue(
      'Café del journey'
    );
    await expect(dialog.getByLabel('Monto')).toHaveValue('1234');

    // The journey does not book a real transaction; close the modal
    // (Escape is the Modal's own close affordance) and keep the checklist
    // state for the cleanup step.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // 4) Limpiar completados: el item sale de la lista.
    await purchases.getByRole('button', { name: 'Limpiar' }).click();
    await expect(
      purchases.getByText('Nada pendiente aquí por ahora ✨')
    ).toBeVisible();
    await expect(page.getByText('Café del journey')).toHaveCount(0);
  });

  test('importe ambiguo agrega el item sin monto y avisa por toast', async ({
    page,
  }) => {
    await seedGoTrueSession(page);
    await page.goto('/pending');

    const purchases = purchasesSection(page);
    await purchases
      .getByLabel('Agregar a Compras pendientes')
      .fill('Item ambiguo');
    await purchases.getByLabel('Importe aproximado (opcional)').fill('1,234');
    await purchases
      .getByRole('button', { name: 'Añadir a Compras pendientes' })
      .click();

    await expect(purchases.getByText('Item ambiguo')).toBeVisible();
    // Zero-friction contract: the item exists WITHOUT an amount and the
    // toast explains why — never guess with money.
    await expect(
      page.getByText('No pude leer el monto "1,234" — lo agrego sin importe')
    ).toBeVisible();
  });
});

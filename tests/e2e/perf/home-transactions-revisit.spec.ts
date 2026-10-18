import { expect, test, type Page, type Request } from '@playwright/test';

type RoutePath = '/' | '/transactions';
type RequestCounts = {
  mainDocumentNavigations: number;
  nextRscRequests: number;
  apiOrSupabaseRequests: number;
};
type FrameSample = {
  frameCount: number;
  elapsedMs: number;
  intervalsMs: number[];
};
type LegMeasurement = {
  iteration: number;
  from: RoutePath;
  to: RoutePath;
  durationMs: number;
  mainDocumentNavigations: number;
  nextRscRequests: number;
  apiOrSupabaseRequests: number;
  frameCount: number;
  fullTransactionsLoaderVisible: boolean;
  maxFrameMs: number;
  estimatedDroppedFramesAt8_33ms: number;
  estimatedDroppedFramesAt16_67ms: number;
};

const ITERATIONS = 3;
const FRAME_SAMPLE_SIZE = 12;
const FRAME_BUDGETS_MS = {
  hz120: 8.33,
  hz60: 16.67,
} as const;
const ROUTE_READY = {
  '/': 'Dashboard',
  '/transactions': 'Transacciones',
} as const;
const WARM_NAVIGATION_LOOP: ReadonlyArray<{
  from: RoutePath;
  to: RoutePath;
}> = [
  { from: '/', to: '/transactions' },
  { from: '/transactions', to: '/' },
  { from: '/', to: '/transactions' },
  { from: '/transactions', to: '/' },
];

function emptyRequestCounts(): RequestCounts {
  return {
    mainDocumentNavigations: 0,
    nextRscRequests: 0,
    apiOrSupabaseRequests: 0,
  };
}

function isNextOrRscRequest(request: Request): boolean {
  const url = new URL(request.url());
  const headers = request.headers();

  return (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    'rsc' in headers ||
    'next-router-state-tree' in headers ||
    'next-url' in headers
  );
}

function isApiOrSupabaseRequest(request: Request): boolean {
  const url = new URL(request.url());
  const isSupabaseHost = /supabase/i.test(url.hostname);
  const isSupabasePath = [
    '/rest/v1/',
    '/auth/v1/',
    '/storage/v1/',
    '/realtime/v1/',
  ].some((prefix) => url.pathname.startsWith(prefix));

  return url.pathname.startsWith('/api/') || isSupabaseHost || isSupabasePath;
}

function requestDelta(
  before: RequestCounts,
  after: RequestCounts
): RequestCounts {
  return {
    mainDocumentNavigations:
      after.mainDocumentNavigations - before.mainDocumentNavigations,
    nextRscRequests: after.nextRscRequests - before.nextRscRequests,
    apiOrSupabaseRequests:
      after.apiOrSupabaseRequests - before.apiOrSupabaseRequests,
  };
}

async function waitForRouteReady(page: Page, path: RoutePath): Promise<void> {
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toBe(path);
  await expect(
    page.getByRole('heading', { name: ROUTE_READY[path], exact: true }).first()
  ).toBeVisible({ timeout: 15_000 });
}

async function findNavigationLink(page: Page, path: RoutePath) {
  const mobileLink = page
    .getByTestId('mobile-nav')
    .locator(`a[href="${path}"]:visible`)
    .first();

  if ((await mobileLink.count()) > 0) return mobileLink;

  return page.locator(`a[href="${path}"]:visible`).first();
}

async function sampleAnimationFrames(page: Page): Promise<FrameSample> {
  return page.evaluate((frameCount) => {
    return new Promise<FrameSample>((resolve) => {
      const intervalsMs: number[] = [];
      let previousTimestamp = performance.now();

      const collectFrame = (timestamp: number) => {
        intervalsMs.push(timestamp - previousTimestamp);
        previousTimestamp = timestamp;

        if (intervalsMs.length === frameCount) {
          resolve({
            frameCount: intervalsMs.length,
            elapsedMs: intervalsMs.reduce(
              (total, interval) => total + interval,
              0
            ),
            intervalsMs,
          });
          return;
        }

        requestAnimationFrame(collectFrame);
      };

      requestAnimationFrame(collectFrame);
    });
  }, FRAME_SAMPLE_SIZE);
}

function estimateDroppedFrames(
  intervalsMs: number[],
  budgetMs: number
): number {
  // Tolerate small rAF timing jitter so normal display cadence is not counted as a drop.
  const cadenceTolerance = 0.05;

  return intervalsMs.reduce(
    (droppedFrames, intervalMs) =>
      droppedFrames +
      Math.max(0, Math.floor(intervalMs / budgetMs + cadenceTolerance) - 1),
    0
  );
}

test.describe('Warm home/transactions revisit performance @no-auth', () => {
  test.slow();

  test('measures the repeated mobile-navigation warm loop without reloads', async ({
    page,
  }) => {
    let requestCounts = emptyRequestCounts();
    const requestListener = (request: Request) => {
      if (
        request.resourceType() === 'document' &&
        request.frame() === page.mainFrame()
      ) {
        requestCounts.mainDocumentNavigations += 1;
      }
      if (isNextOrRscRequest(request)) requestCounts.nextRscRequests += 1;
      if (isApiOrSupabaseRequest(request)) {
        requestCounts.apiOrSupabaseRequests += 1;
      }
    };

    page.on('request', requestListener);

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForRouteReady(page, '/');
      await page.waitForTimeout(500);

      // Exclude the initial document and its bootstrap requests from soft-navigation counts.
      requestCounts = emptyRequestCounts();
      const measurements: LegMeasurement[] = [];

      for (let iteration = 1; iteration <= ITERATIONS; iteration += 1) {
        for (const step of WARM_NAVIGATION_LOOP) {
          expect(new URL(page.url()).pathname).toBe(step.from);
          const link = await findNavigationLink(page, step.to);
          await expect(link).toBeVisible({ timeout: 15_000 });

          const before = { ...requestCounts };
          const clickStartMs = await page.evaluate(() => performance.now());
          await link.evaluate((element) => (element as HTMLElement).click());
          await waitForRouteReady(page, step.to);
          const readyMs = await page.evaluate(() => performance.now());
          const countsAtReady = { ...requestCounts };
          const frameSample = await sampleAnimationFrames(page);
          const fullTransactionsLoaderVisible = await page
            .getByText('Cargando transacciones...', { exact: true })
            .first()
            .isVisible()
            .catch(() => false);
          const counts = requestDelta(before, countsAtReady);

          expect(new URL(page.url()).pathname).toBe(step.to);

          measurements.push({
            iteration,
            from: step.from,
            to: step.to,
            durationMs: readyMs - clickStartMs,
            mainDocumentNavigations: counts.mainDocumentNavigations,
            nextRscRequests: counts.nextRscRequests,
            apiOrSupabaseRequests: counts.apiOrSupabaseRequests,
            frameCount: frameSample.frameCount,
            fullTransactionsLoaderVisible,
            maxFrameMs: Math.max(...frameSample.intervalsMs),
            estimatedDroppedFramesAt8_33ms: estimateDroppedFrames(
              frameSample.intervalsMs,
              FRAME_BUDGETS_MS.hz120
            ),
            estimatedDroppedFramesAt16_67ms: estimateDroppedFrames(
              frameSample.intervalsMs,
              FRAME_BUDGETS_MS.hz60
            ),
          });
        }
      }

      console.log(
        '[browser/WebView proxy evidence; not Android GPU/Perfetto evidence]'
      );
      console.table(measurements);
      console.log(
        JSON.stringify(
          {
            protocol:
              'Inicio (/) → Transacciones (/transactions) → Inicio (/) → Transacciones (/transactions)',
            iterations: ITERATIONS,
            legs: measurements.length,
            mainDocumentNavigationsAfterInitialLoad: measurements.reduce(
              (total, measurement) =>
                total + measurement.mainDocumentNavigations,
              0
            ),
            nextRscRequests: measurements.reduce(
              (total, measurement) => total + measurement.nextRscRequests,
              0
            ),
            apiOrSupabaseRequests: measurements.reduce(
              (total, measurement) => total + measurement.apiOrSupabaseRequests,
              0
            ),
            frameBudgetsMs: FRAME_BUDGETS_MS,
          },
          null,
          2
        )
      );

      expect(
        measurements.every(
          ({ mainDocumentNavigations }) => mainDocumentNavigations === 0
        )
      ).toBe(true);
    } finally {
      page.off('request', requestListener);
    }
  });
});

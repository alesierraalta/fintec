import { after } from 'next/server';
import { logger } from '@/lib/utils/logger';

const inFlight = new Map<string, Promise<void>>();

export type RateRefreshTask = () => Promise<void>;

/**
 * Schedules a single-flight background refresh that runs AFTER the current
 * response has been flushed (Next.js `after()` — the project-supported
 * pattern; a floating promise may be terminated by the serverless runtime).
 *
 * Concurrent stale requests for the same key in the same process share ONE
 * in-flight refresh: the second caller returns immediately without starting
 * another scrape. Failures are logged (observable) but never thrown, so the
 * already-served (stale) response stays intact.
 *
 * If the runtime cannot attach the post-response task (e.g. no request scope
 * or `after()` unavailable), the refresh is skipped with a logged warning and
 * the served response is never affected.
 *
 * In-process only: multiple server instances may each run one refresh (a
 * distributed lock / Redis dedup is out of scope for issue #50).
 */
export function scheduleBackgroundRateRefresh(
  key: string,
  task: RateRefreshTask
): void {
  const run = (): Promise<void> => {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const started = Promise.resolve()
      .then(task)
      .catch((error: unknown) => {
        logger.error(
          `[rate-refresh] background refresh failed for ${key}:`,
          error
        );
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, started);
    return started;
  };

  try {
    after(run);
  } catch (error) {
    logger.warn(
      `[rate-refresh] could not schedule background refresh for ${key} (response scope unavailable):`,
      error
    );
  }
}

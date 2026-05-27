import crypto from 'crypto';
import {
  ScrapeStage,
  ScrapeAttempt,
  ScrapePipelineResult,
  ScrapeTrigger,
} from '@/lib/rates/scrape-types';
import { Lock } from '@/lib/rates/simple-lock';
import { ScrapeAttemptsRepository } from '@/repositories/contracts/scrape-attempts-repository';
import { BCVRateWriter } from '@/repositories/contracts/bcv-rate-writer';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { ScraperResult, ScraperErrorCategory } from '@/lib/scrapers/types';
import { logger } from '@/lib/utils/logger';

const PROVIDER = 'bcv';

function stageFromCategory(category?: ScraperErrorCategory): ScrapeStage {
  switch (category) {
    case ScraperErrorCategory.TIMEOUT:
    case ScraperErrorCategory.CONNECTIVITY:
      return ScrapeStage.FETCH;
    case ScraperErrorCategory.PARSING:
      return ScrapeStage.PARSE;
    case ScraperErrorCategory.VALIDATION:
      return ScrapeStage.VALIDATE;
    case ScraperErrorCategory.RATE_LIMIT:
      return ScrapeStage.RATE_LIMIT;
    case ScraperErrorCategory.UNKNOWN:
    default:
      return ScrapeStage.UNKNOWN;
  }
}

export function mapScraperResultToStage(
  result?: ScraperResult<unknown>
): ScrapeStage {
  if (!result || !result.error) return ScrapeStage.UNKNOWN;
  if (result.errorCategory) return stageFromCategory(result.errorCategory);

  const msg = result.error.toLowerCase();
  if (msg.includes('circuit') || msg.includes('circuit_breaker_open')) {
    return ScrapeStage.CIRCUIT_BREAKER;
  }
  if (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('econn') ||
    msg.includes('http')
  ) {
    return ScrapeStage.FETCH;
  }
  if (msg.includes('parse')) return ScrapeStage.PARSE;
  if (msg.includes('validat')) return ScrapeStage.VALIDATE;

  return ScrapeStage.UNKNOWN;
}

export class ScrapeAndPersistRates {
  constructor(
    private lock: Lock,
    private attemptsRepo: ScrapeAttemptsRepository,
    private rateWriter: BCVRateWriter
  ) {}

  async execute(
    trigger: ScrapeTrigger = 'on-demand'
  ): Promise<ScrapePipelineResult> {
    const attemptId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const lockKey = 'scrape:bcv';

    const record = async (
      stage: ScrapeStage,
      status: ScrapePipelineResult['status'],
      failureReason?: string
    ): Promise<void> => {
      const attempt: ScrapeAttempt = {
        attemptId,
        provider: PROVIDER,
        trigger,
        stage,
        status,
        failureReason,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
      await this.attemptsRepo.recordAttempt(attempt);
    };

    const acquired = await this.lock.acquire(lockKey, 30_000);
    if (!acquired) {
      await record(
        ScrapeStage.SCHEDULER,
        'skipped_locked',
        'Lock held by another process'
      );
      return { attemptId, status: 'skipped_locked', success: false };
    }

    try {
      const scraperResult = await scrapeBCVRates();

      if (!scraperResult.success) {
        const stage = mapScraperResultToStage(scraperResult);
        await record(stage, 'failure', scraperResult.error);
        return {
          attemptId,
          status: 'failure',
          success: false,
          failureStage: stage,
          failureReason: scraperResult.error,
        };
      }

      const storeOk = await this.rateWriter.write({
        usd: scraperResult.data.usd,
        eur: scraperResult.data.eur,
        source: scraperResult.data.source,
        lastUpdated: scraperResult.data.lastUpdated,
      });

      if (!storeOk) {
        await record(
          ScrapeStage.PERSIST,
          'failure',
          'Failed to persist scraped rates to DB'
        );
        return {
          attemptId,
          status: 'failure',
          success: false,
          failureStage: ScrapeStage.PERSIST,
          failureReason: 'Failed to persist scraped rates to DB',
        };
      }

      await record(ScrapeStage.PERSIST, 'success');
      logger.info(`[ScrapeAndPersistRates] Success: ${attemptId}`);

      return {
        attemptId,
        status: 'success',
        success: true,
        result: {
          usd: scraperResult.data.usd,
          eur: scraperResult.data.eur,
          source: scraperResult.data.source,
          lastUpdated: scraperResult.data.lastUpdated,
        },
      };
    } finally {
      await this.lock.release(lockKey);
    }
  }
}

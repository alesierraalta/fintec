import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { createServerAppRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';
import { calculate_next_execution_date } from '@/lib/dates/recurring';
import { logger } from '@/lib/utils/logger';
import { withErrorHandling } from '@/lib/api-middleware';

const handleRequest = withErrorHandling(async (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabaseAdmin = createServiceClient();
  const adminRepository = createServerAppRepository({ supabase: supabaseAdmin });

  // Find all active recurring transactions that are due
  const dueTransactions = await adminRepository.recurringTransactions.findDueForExecution();
  logger.info(`Found ${dueTransactions.length} due recurring transactions to execute.`);

  let successCount = 0;
  let failCount = 0;
  const results: Array<{ id: string; status: 'success' | 'failed'; error?: string; txId?: string }> = [];

  for (const tx of dueTransactions) {
    try {
      // Instantiate a request context isolated for this user
      const context = new RequestContext(tx.userId);
      const userRepo = createServerAppRepository({
        supabase: supabaseAdmin,
        requestContext: context,
      });

      let exchangeRate = 1.0;
      let amountBaseMinor = tx.amountMinor;

      // Fetch exchange rate if currency is VES
      if (tx.currencyCode === 'VES') {
        const rateInfo = await userRepo.exchangeRates.getRateWithFallback('USD', 'VES');
        exchangeRate = rateInfo.rate;
        amountBaseMinor = Math.round(tx.amountMinor / exchangeRate);
      }

      const nextExecutionDate = calculate_next_execution_date(
        tx.nextExecutionDate,
        tx.frequency,
        tx.intervalCount || 1
      );

      const newTxId = await userRepo.recurringTransactions.executeDue(
        tx.id,
        amountBaseMinor,
        exchangeRate,
        tx.nextExecutionDate,
        nextExecutionDate,
        tx.userId
      );

      logger.info(`Successfully executed recurring transaction ${tx.id} for user ${tx.userId}. Created transaction: ${newTxId}`);
      successCount++;
      results.push({ id: tx.id, status: 'success', txId: newTxId });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Error executing recurring transaction ${tx.id} for user ${tx.userId}: ${errMsg}`, err);
      failCount++;
      results.push({ id: tx.id, status: 'failed', error: errMsg });
    }
  }

  return NextResponse.json({
    success: true,
    processed: successCount,
    failed: failCount,
    results,
  });
});

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

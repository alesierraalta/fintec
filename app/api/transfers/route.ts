import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerTransfersRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';
import { logger } from '@/lib/utils/logger';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors/validation-error';
import { AuthError } from '@/lib/errors/auth-error';
import { NotFoundError } from '@/lib/errors/not-found-error';

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Unauthorized');
  }

  return { userId: user.id, supabase };
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId, supabase } = await getAuthenticatedUserId();
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const limit = searchParams.get('limit');

  const requestContext = new RequestContext(userId);
  const repository = createServerTransfersRepository({
    supabase,
    requestContext,
  });
  const transfers = await repository.listByUserId(userId, {
    accountId,
    startDate,
    endDate,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  return NextResponse.json(
    successResponse({
      transfers: transfers.map((transfer) => ({
        id: transfer.id,
        fromTransaction: transfer.fromTransaction
          ? {
              ...transfer.fromTransaction,
              amountMinor: transfer.fromTransaction.amountMinor || 0,
              exchangeRate: transfer.fromTransaction.exchangeRate,
              amountBaseMinor: transfer.fromTransaction.amountBaseMinor,
            }
          : null,
        toTransaction: transfer.toTransaction
          ? {
              ...transfer.toTransaction,
              amountMinor: transfer.toTransaction.amountMinor || 0,
              exchangeRate: transfer.toTransaction.exchangeRate,
              amountBaseMinor: transfer.toTransaction.amountBaseMinor,
            }
          : null,
        amount: transfer.amountMinor,
        commissionMinor: transfer.commissionMinor,
        totalDebitMinor: transfer.totalDebitMinor,
        date: transfer.date,
        description: transfer.description,
      })),
      count: transfers.length,
    })
  );
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, supabase } = await getAuthenticatedUserId();

  if (!body.fromAccountId || !body.toAccountId || !body.amount) {
    throw new ValidationError(
      'Missing required fields: fromAccountId, toAccountId, amount'
    );
  }

  const amountMajor = body.amount;
  if (
    typeof amountMajor !== 'number' ||
    !Number.isFinite(amountMajor) ||
    amountMajor <= 0
  ) {
    throw new ValidationError('amount must be a positive number');
  }

  if (body.fromAccountId === body.toAccountId) {
    throw new ValidationError('Cannot transfer to the same account');
  }

  if (body.exchangeRate != null) {
    const rate = body.exchangeRate;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new ValidationError(
        'exchangeRate must be a positive finite number'
      );
    }
  }

  let commissionMinor: number | undefined;
  const rawCommission = body.commissionMinor ?? body.commission ?? body.commissionMajor ?? body.feeMinor ?? body.comision ?? body.comisionMinor;
  if (rawCommission !== undefined && rawCommission !== null && String(rawCommission).trim() !== '') {
    const parsed = Number(rawCommission);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ValidationError('commission must be a non-negative finite number');
    }
    // Convert to minor using 2 decimals (source currency unknown here, use 2 as default; repo will revalidate with exact currency)
    // Keep raw minor if already integer minor? Heuristic: if value is integer and already minor-like, keep? But we treat as major.
    // To support both, if rawCommission is integer and >=1000 and body has explicit commissionMinor, we already used it.
    // For now, treat as major and convert with 2 decimals
    const decimals = 2;
    const factor = Math.pow(10, decimals);
    const asMinor = Math.round(parsed * factor);
    // If parsed has more decimals than allowed for 2, we still allow but repo will validate with actual currency precision
    if (!Number.isSafeInteger(asMinor) || asMinor < 0) {
      throw new ValidationError('commission overflows');
    }
    commissionMinor = asMinor;
    // If body already provided commissionMinor as integer minor directly, prefer that exact value
    if (body.commissionMinor !== undefined && Number.isSafeInteger(body.commissionMinor) && body.commissionMinor >= 0) {
      commissionMinor = body.commissionMinor;
    }
  }

  const requestContext = new RequestContext(userId);
  const repository = createServerTransfersRepository({
    supabase,
    requestContext,
  });
  const created = await repository.create(userId, {
    fromAccountId: body.fromAccountId,
    toAccountId: body.toAccountId,
    amountMajor,
    description: body.description,
    date: body.date,
    exchangeRate: body.exchangeRate,
    rateSource: body.rateSource || null,
    commissionMinor,
  });

  return NextResponse.json(successResponse(created), { status: 201 });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const { userId, supabase } = await getAuthenticatedUserId();
  const { searchParams } = new URL(request.url);
  const transferId = searchParams.get('id');

  if (!transferId) {
    throw new ValidationError('Transfer ID is required');
  }

  const requestContext = new RequestContext(userId);
  const repository = createServerTransfersRepository({
    supabase,
    requestContext,
  });
  await repository.delete(userId, transferId);

  return NextResponse.json(
    successResponse({ message: 'Transfer deleted successfully' })
  );
});

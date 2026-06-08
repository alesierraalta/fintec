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

  if (body.fromAccountId === body.toAccountId) {
    throw new ValidationError('Cannot transfer to the same account');
  }

  const requestContext = new RequestContext(userId);
  const repository = createServerTransfersRepository({
    supabase,
    requestContext,
  });
  const created = await repository.create(userId, {
    fromAccountId: body.fromAccountId,
    toAccountId: body.toAccountId,
    amountMajor: body.amount,
    description: body.description,
    date: body.date,
    exchangeRate: body.exchangeRate,
    rateSource: body.rateSource || null,
  });

  return NextResponse.json(
    successResponse(created),
    { status: 201 }
  );
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

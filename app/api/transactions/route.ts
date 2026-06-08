import { NextRequest, NextResponse } from 'next/server';
import { CreateTransactionDTO, DebtStatus } from '@/types';
import { TransactionType } from '@/types';
import { canCreateTransaction } from '@/lib/subscriptions/check-limit';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors/validation-error';
import { AuthError } from '@/lib/errors/auth-error';

// GET /api/transactions - Fetch all transactions
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const requestContext = new RequestContext(user.id);
  const repository = createServerAppRepository({ supabase, requestContext });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as TransactionType | null;
  const accountId = searchParams.get('accountId');
  const categoryId = searchParams.get('categoryId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = searchParams.get('limit');
  const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

  if (limit && (!Number.isFinite(parsedLimit) || (parsedLimit ?? 0) <= 0)) {
    throw new ValidationError('limit must be a positive integer');
  }

  const pagination = parsedLimit
    ? { page: 1, limit: parsedLimit }
    : undefined;

  let transactions;
  let totalCount: number;

  if (accountId) {
    const result = await repository.transactions.findByAccountId(
      accountId,
      pagination
    );
    transactions = result.data;
    totalCount = result.total;
  } else if (categoryId) {
    const result = await repository.transactions.findByCategoryId(
      categoryId,
      pagination
    );
    transactions = result.data;
    totalCount = result.total;
  } else if (startDate && endDate) {
    const result = await repository.transactions.findByDateRange(
      startDate,
      endDate,
      pagination
    );
    transactions = result.data;
    totalCount = result.total;
  } else if (type) {
    const result = await repository.transactions.findByType(type, pagination);
    transactions = result.data;
    totalCount = result.total;
  } else {
    transactions = await repository.transactions.findAll(parsedLimit);
    totalCount = transactions.length;
  }

  return NextResponse.json(
    successResponse({ transactions, count: transactions.length, totalCount })
  );
});

// POST /api/transactions - Create new transaction
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const requestContext = new RequestContext(user.id);
  const repository = createServerAppRepository({ supabase, requestContext });
  const body = await request.json();

  // Validate required fields
  if (!body.accountId || !body.amount || !body.type || !body.categoryId) {
    throw new ValidationError(
      'Missing required fields: accountId, amount, type, categoryId'
    );
  }

  if (!Number.isInteger(body.amount)) {
    throw new ValidationError('amount must be an integer in minor units');
  }

  if (body.isDebt === true && !body.debtDirection) {
    throw new ValidationError('debtDirection is required when isDebt=true');
  }

  if (body.debtStatus === DebtStatus.SETTLED && !body.settledAt) {
    throw new ValidationError('settledAt is required when debtStatus=SETTLED');
  }

  // Check subscription limits for authenticated user
  const limitCheck = await canCreateTransaction(user.id);
  if (!limitCheck.allowed) {
    throw new ValidationError(limitCheck.reason || 'Límite alcanzado', {
      limitReached: true,
      current: limitCheck.current,
      limit: limitCheck.limit,
    });
  }

  const transactionData: CreateTransactionDTO = {
    accountId: body.accountId,
    amountMinor: body.amount,
    currencyCode: body.currencyCode || 'USD',
    type: body.type,
    exchangeRate: body.exchangeRate,
    categoryId: body.categoryId,
    description: body.description || '',
    note: body.note || undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    isDebt: body.isDebt === true,
    debtDirection: body.debtDirection,
    debtStatus:
      body.isDebt === true ? body.debtStatus || DebtStatus.OPEN : undefined,
    counterpartyName: body.counterpartyName || undefined,
    settledAt: body.settledAt || undefined,
    date: body.date || new Date().toISOString(),
  };

  const transaction = await repository.transactions.create(transactionData);

  return NextResponse.json(
    successResponse(transaction),
    { status: 201 }
  );
});

// PUT /api/transactions - Update transaction (requires id in body)
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const requestContext = new RequestContext(user.id);
  const repository = createServerAppRepository({ supabase, requestContext });
  const body = await request.json();

  if (!body.id) {
    throw new ValidationError('Transaction ID is required');
  }

  const transaction = await repository.transactions.update(body.id, body);

  return NextResponse.json(successResponse(transaction));
});

// DELETE /api/transactions - Delete transaction (requires id in query params)
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const requestContext = new RequestContext(user.id);
  const repository = createServerAppRepository({ supabase, requestContext });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('Transaction ID is required');
  }

  await repository.transactions.delete(id);

  return NextResponse.json(successResponse({ message: 'Transaction deleted successfully' }));
});

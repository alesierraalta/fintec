import { NextRequest, NextResponse } from 'next/server';
import { CreateTransactionDTO, DebtStatus } from '@/types';
import { TransactionType } from '@/types';
import { canCreateTransaction } from '@/lib/subscriptions/check-limit';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';

// Deferred follow-up: goal progress auto-sync for linked accounts should be wired
// after transaction writes once Phase 1 semantics/performance are validated.

// GET /api/transactions - Fetch all transactions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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
      return NextResponse.json(
        {
          success: false,
          error: 'limit must be a positive integer',
        },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      totalCount: totalCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestContext = new RequestContext(user.id);
    const repository = createServerAppRepository({ supabase, requestContext });
    const body = await request.json();

    // Validate required fields
    if (!body.accountId || !body.amount || !body.type || !body.categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: accountId, amount, type, categoryId',
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(body.amount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'amount must be an integer in minor units',
        },
        { status: 400 }
      );
    }

    if (body.isDebt === true && !body.debtDirection) {
      return NextResponse.json(
        {
          success: false,
          error: 'debtDirection is required when isDebt=true',
        },
        { status: 400 }
      );
    }

    if (body.debtStatus === DebtStatus.SETTLED && !body.settledAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'settledAt is required when debtStatus=SETTLED',
        },
        { status: 400 }
      );
    }

    // Check subscription limits for authenticated user
    const limitCheck = await canCreateTransaction(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: limitCheck.reason || 'Límite alcanzado',
          limitReached: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
        },
        { status: 403 }
      );
    }

    const transactionData: CreateTransactionDTO = {
      accountId: body.accountId,
      amountMinor: body.amount, // Convert to minor units if needed
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
      {
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/transactions - Update transaction (requires id in body)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestContext = new RequestContext(user.id);
    const repository = createServerAppRepository({ supabase, requestContext });
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    const transaction = await repository.transactions.update(body.id, body);

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions - Delete transaction (requires id in query params)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestContext = new RequestContext(user.id);
    const repository = createServerAppRepository({ supabase, requestContext });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    await repository.transactions.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

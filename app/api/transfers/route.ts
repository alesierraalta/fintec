import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerTransfersRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';
import { logger } from '@/lib/utils/logger';

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { userId: user.id, supabase };
}

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      data: transfers.map((transfer) => ({
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
    });
  } catch (error) {
    logger.error('Transfer API GET error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transfers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, supabase } = await getAuthenticatedUserId();

    if (!body.fromAccountId || !body.toAccountId || !body.amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: fromAccountId, toAccountId, amount',
        },
        { status: 400 }
      );
    }

    if (body.fromAccountId === body.toAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot transfer to the same account',
        },
        { status: 400 }
      );
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
      {
        success: true,
        message: 'Transfer created successfully',
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Transfer API POST error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message,
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes('not found') ||
        error.message.includes('does not belong'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes('balance') ||
        error.message.includes('Insufficient') ||
        error.message.includes('same account'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transfer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, supabase } = await getAuthenticatedUserId();
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('id');

    if (!transferId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transfer ID is required',
        },
        { status: 400 }
      );
    }

    const requestContext = new RequestContext(userId);
    const repository = createServerTransfersRepository({
      supabase,
      requestContext,
    });
    await repository.delete(userId, transferId);

    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully',
    });
  } catch (error) {
    logger.error('Transfer API DELETE error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message,
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes('Transfer not found')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transfer not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete transfer',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

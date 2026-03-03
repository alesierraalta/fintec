import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import {
  DeleteRecurringTransactionQuerySchema,
  UpdateRecurringTransactionPayloadSchema,
} from '@/lib/validations/recurring-transactions';
import { z } from 'zod';

const RECURRING_UPDATE_VALIDATION_ERROR =
  'Invalid recurring transaction update payload';
const RECURRING_DELETE_VALIDATION_ERROR =
  'Invalid recurring transaction delete parameters';

function formatZodIssues(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'request',
    message: issue.message,
  }));
}

function validationErrorResponse(errorMessage: string, error: z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      details: formatZodIssues(error),
    },
    { status: 400 }
  );
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('PGRST116') ||
    error.message.includes(
      'JSON object requested, multiple (or no) rows returned'
    )
  );
}

// GET /api/recurring-transactions - Fetch recurring transactions for authenticated user
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

    const repository = createServerAppRepository({ supabase });
    const transactions = await repository.recurringTransactions.findByUserId(
      user.id
    );
    const summary = await repository.recurringTransactions.getSummary(user.id);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recurring transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/recurring-transactions - Create new recurring transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.name ||
      !body.type ||
      !body.accountId ||
      !body.currencyCode ||
      !body.amountMinor ||
      !body.frequency ||
      !body.startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: name, type, accountId, currencyCode, amountMinor, frequency, startDate',
        },
        { status: 400 }
      );
    }

    const repository = createServerAppRepository({ supabase });
    const transaction = await repository.recurringTransactions.create(
      body,
      user.id
    );

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        message: 'Recurring transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/recurring-transactions - Update recurring transaction
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: RECURRING_UPDATE_VALIDATION_ERROR,
          details: [
            { field: 'request', message: 'Request body must be valid JSON' },
          ],
        },
        { status: 400 }
      );
    }

    const parsedUpdate =
      UpdateRecurringTransactionPayloadSchema.safeParse(body);

    if (!parsedUpdate.success) {
      return validationErrorResponse(
        RECURRING_UPDATE_VALIDATION_ERROR,
        parsedUpdate.error
      );
    }

    const { id, ...updatePayload } = parsedUpdate.data;

    const repository = createServerAppRepository({ supabase });

    const existingTransaction = await repository.recurringTransactions.findById(
      id,
      user.id
    );

    if (!existingTransaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recurring transaction not found',
        },
        { status: 404 }
      );
    }

    const transaction = await repository.recurringTransactions.update(
      id,
      updatePayload,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Recurring transaction updated successfully',
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recurring transaction not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring-transactions - Delete recurring transaction
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedDelete = DeleteRecurringTransactionQuerySchema.safeParse({
      id: searchParams.get('id'),
    });

    if (!parsedDelete.success) {
      return validationErrorResponse(
        RECURRING_DELETE_VALIDATION_ERROR,
        parsedDelete.error
      );
    }

    const { id } = parsedDelete.data;

    const repository = createServerAppRepository({ supabase });

    const existingTransaction = await repository.recurringTransactions.findById(
      id,
      user.id
    );

    if (!existingTransaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recurring transaction not found',
        },
        { status: 404 }
      );
    }

    await repository.recurringTransactions.delete(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Recurring transaction deleted successfully',
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recurring transaction not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

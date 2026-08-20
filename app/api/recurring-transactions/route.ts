import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import {
  DeleteRecurringTransactionQuerySchema,
  UpdateRecurringTransactionPayloadSchema,
} from '@/lib/validations/recurring-transactions';
import { resolveRecurringNextExecutionDate } from '@/lib/dates/recurring';
import {
  RecurringFrequency,
  RecurringTransaction,
} from '@/types/recurring-transactions';
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

    const registerFirstOperation = body.registerFirstOperation === true;

    // Compute the next execution date BEFORE persisting the rule so the rule
    // and its schedule are stored atomically. When the user registers the
    // first operation now, the next scheduled operation is the following
    // frequency occurrence (never the immediate operation), so cron cannot
    // duplicate it.
    const nextExecutionDate = resolveRecurringNextExecutionDate(
      body.startDate as string,
      body.frequency as RecurringFrequency,
      body.intervalCount ? Number(body.intervalCount) : 1,
      registerFirstOperation
    );

    const repository = createServerAppRepository({ supabase });

    // Rule-first: persist the rule before reporting success. If this fails,
    // nothing follows (no first operation, no success claim).
    let transaction: RecurringTransaction;
    try {
      transaction = await repository.recurringTransactions.create(
        { ...body, nextExecutionDate },
        user.id
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se pudo guardar la regla recurrente. Revisa tu conexión o intenta de nuevo.',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // The user explicitly declined to register the first operation now: the
    // rule is saved and cron schedules its first due occurrence.
    if (!registerFirstOperation) {
      return NextResponse.json(
        {
          success: true,
          outcome: 'rule-created',
          data: transaction,
          message: 'Regla recurrente guardada correctamente',
        },
        { status: 201 }
      );
    }

    // Register the first operation now. If it fails, we MUST retain the rule,
    // report the partial state with a corrective action in Spanish, and never
    // claim full success.
    try {
      const firstTransaction = await repository.transactions.create({
        type: transaction.type,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        currencyCode: transaction.currencyCode,
        amountMinor: transaction.amountMinor,
        date: transaction.startDate,
        description: transaction.description,
        note: transaction.note,
        tags: transaction.tags,
        isDebt: false,
      } as any);

      return NextResponse.json(
        {
          success: true,
          outcome: 'first-operation-created',
          data: transaction,
          transactionId: firstTransaction.id,
          message: 'Regla recurrente y primera operación creadas',
        },
        { status: 201 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          outcome: 'partial-failure',
          data: transaction,
          error:
            'No se pudo registrar la primera operación, aunque la regla recurrente quedó guardada. Reintenta registrar la operación o edítala desde la página de recurrencias.',
          transactionId: undefined,
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 202 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          'No se pudo procesar la regla recurrente. Revisa tu conexión o intenta de nuevo.',
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

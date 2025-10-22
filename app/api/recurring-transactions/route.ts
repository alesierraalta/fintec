import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { supabase } from '@/repositories/supabase/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const repository = new SupabaseAppRepository();

// GET /api/recurring-transactions - Fetch recurring transactions for authenticated user
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json(
        { success: false, error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No authenticated user' },
        { status: 401 }
      );
    }

    // Direct query to test
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Simple summary calculation
    const transactions = data || [];
    const summary = {
      totalActive: transactions.filter(t => t.is_active).length,
      totalInactive: transactions.filter(t => !t.is_active).length,
      nextExecutions: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      },
      byFrequency: {
        daily: transactions.filter(t => t.frequency === 'daily').length,
        weekly: transactions.filter(t => t.frequency === 'weekly').length,
        monthly: transactions.filter(t => t.frequency === 'monthly').length,
        yearly: transactions.filter(t => t.frequency === 'yearly').length
      }
    };
    
    return NextResponse.json({
      success: true,
      data: { 
        transactions: transactions.map(t => ({
          id: t.id,
          userId: t.user_id,
          name: t.name,
          type: t.type,
          accountId: t.account_id,
          categoryId: t.category_id,
          currencyCode: t.currency_code,
          amountMinor: t.amount_minor,
          description: t.description,
          note: t.note,
          tags: t.tags,
          frequency: t.frequency,
          intervalCount: t.interval_count,
          startDate: t.start_date,
          endDate: t.end_date,
          nextExecutionDate: t.next_execution_date,
          isActive: t.is_active,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          lastExecutedAt: t.last_executed_at
        })),
        summary 
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch recurring transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/recurring-transactions - Create new recurring transaction
export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.type || !body.accountId || !body.currencyCode || !body.amountMinor || !body.frequency || !body.startDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, type, accountId, currencyCode, amountMinor, frequency, startDate' 
        },
        { status: 400 }
      );
    }

    const transaction = await repository.recurringTransactions.create(body, user.id);
    
    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Recurring transaction created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/recurring-transactions - Update recurring transaction
export async function PUT(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: id' 
        },
        { status: 400 }
      );
    }

    const transaction = await repository.recurringTransactions.update(body.id, body);
    
    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Recurring transaction updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring-transactions - Delete recurring transaction
export async function DELETE(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: id' 
        },
        { status: 400 }
      );
    }

    await repository.recurringTransactions.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Recurring transaction deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete recurring transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

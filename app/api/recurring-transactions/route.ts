import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { supabase } from '@/repositories/supabase/client';

const repository = new SupabaseAppRepository();

// GET /api/recurring-transactions - Fetch recurring transactions for authenticated user
export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transactions = await repository.recurringTransactions.findByUserId(user.id);
    const summary = await repository.recurringTransactions.getSummary(user.id);
    
    return NextResponse.json({
      success: true,
      data: { transactions, summary }
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

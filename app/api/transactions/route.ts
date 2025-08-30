import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { CreateTransactionDTO } from '@/types';
import { TransactionType } from '@/types';

const repository = new SupabaseAppRepository();

// GET /api/transactions - Fetch all transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as TransactionType | null;
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    
    let transactions;
    let totalCount: number;
    
    if (accountId) {
      const result = await repository.transactions.findByAccountId(accountId);
      transactions = result.data;
      totalCount = result.total;
    } else if (categoryId) {
      const result = await repository.transactions.findByCategoryId(categoryId);
      transactions = result.data;
      totalCount = result.total;
    } else if (startDate && endDate) {
      const result = await repository.transactions.findByDateRange(startDate, endDate);
      transactions = result.data;
      totalCount = result.total;
    } else if (type) {
      const result = await repository.transactions.findByType(type);
      transactions = result.data;
      totalCount = result.total;
    } else {
      transactions = await repository.transactions.findAll();
      // Apply limit if specified
      if (limit) {
        const limitNum = parseInt(limit);
        transactions = transactions.slice(0, limitNum);
      }
      totalCount = transactions.length;
    }
    
    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      totalCount: totalCount
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.accountId || !body.amount || !body.type || !body.categoryId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: accountId, amount, type, categoryId' 
        },
        { status: 400 }
      );
    }
    
    const transactionData: CreateTransactionDTO = {
      accountId: body.accountId,
      amountMinor: body.amount, // Convert to minor units if needed
      currencyCode: body.currencyCode || 'USD',
      type: body.type,
      categoryId: body.categoryId,
      description: body.description || '',
      date: body.date || new Date().toISOString()
    };
    
    const transaction = await repository.transactions.create(transactionData);
    
    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transaction', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/transactions - Update transaction (requires id in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction ID is required' 
        },
        { status: 400 }
      );
    }
    
    const transaction = await repository.transactions.update(body.id, body);
    
    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update transaction', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions - Delete transaction (requires id in query params)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction ID is required' 
        },
        { status: 400 }
      );
    }
    
    await repository.transactions.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete transaction', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

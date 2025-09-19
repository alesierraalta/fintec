import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateTransactionDTO } from '@/types';
import { TransactionType } from '@/types';
import { toMinorUnits } from '@/lib/money';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/transfers - Fetch all transfers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    
    let transfers;
    
    if (accountId) {
      // Get transactions that are transfers for a specific account
      const result = await repository.transactions.findByAccountId(accountId);
      transfers = result.data.filter(t => t.transferId);
    } else if (startDate && endDate) {
      const result = await repository.transactions.findByDateRange(startDate, endDate);
      transfers = result.data.filter(t => t.transferId);
    } else {
      const allTransactions = await repository.transactions.findAll();
      transfers = allTransactions.filter(t => t.transferId);
    }
    
    // Group transfers by transferId
    const transferGroups = transfers.reduce((groups: any, transaction: any) => {
      const transferId = transaction.transferId;
      if (!groups[transferId]) {
        groups[transferId] = [];
      }
      groups[transferId].push(transaction);
      return groups;
    }, {});
    
    const transferList = Object.entries(transferGroups).map(([transferId, transactions]: [string, any]) => {
      const fromTransaction = transactions.find((t: any) => t.type === 'TRANSFER_OUT');
      const toTransaction = transactions.find((t: any) => t.type === 'TRANSFER_IN');
      
      return {
        id: transferId,
        fromTransaction: {
          ...fromTransaction,
          amountMinor: fromTransaction?.amountMinor || 0,
          exchangeRate: fromTransaction?.exchangeRate,
          amountBaseMinor: fromTransaction?.amountBaseMinor
        },
        toTransaction: {
          ...toTransaction,
          amountMinor: toTransaction?.amountMinor || 0,
          exchangeRate: toTransaction?.exchangeRate,
          amountBaseMinor: toTransaction?.amountBaseMinor
        },
        amount: fromTransaction?.amount || 0,
        date: fromTransaction?.date || toTransaction?.date,
        description: fromTransaction?.description || toTransaction?.description
      };
    });
    
    return NextResponse.json({
      success: true,
      data: transferList,
      count: transferList.length
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transfers', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/transfers - Create new transfer
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/transfers called');
    const body = await request.json();
    console.log('Request body:', body);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // For now, skip authentication and use a hardcoded user ID for testing
    const userId = 'afdd840d-c869-43f8-8eee-3830c0257095';
    
    // Validate required fields
    if (!body.fromAccountId || !body.toAccountId || !body.amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: fromAccountId, toAccountId, amount' 
        },
        { status: 400 }
      );
    }
    
    if (body.fromAccountId === body.toAccountId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot transfer to the same account' 
        },
        { status: 400 }
      );
    }
    
    // Get account details to determine currencies
    const { data: fromAccount, error: fromError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', body.fromAccountId)
      .eq('user_id', userId)
      .single();
      
    const { data: toAccount, error: toError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', body.toAccountId)
      .eq('user_id', userId)
      .single();
    
    if (fromError || toError || !fromAccount || !toAccount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'One or both accounts not found',
          debug: {
            fromAccountId: body.fromAccountId,
            toAccountId: body.toAccountId,
            fromAccountFound: !!fromAccount,
            toAccountFound: !!toAccount,
            fromError: fromError?.message,
            toError: toError?.message
          }
        },
        { status: 404 }
      );
    }
    
    // For now, just return success with account details
    return NextResponse.json({
      success: true,
      message: 'Transfer would be successful',
      fromAccount: { id: fromAccount.id, name: fromAccount.name, balance: fromAccount.balance },
      toAccount: { id: toAccount.id, name: toAccount.name, balance: toAccount.balance },
      amount: body.amount
    });
  } catch (error) {
    console.error('Transfer API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transfer', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transfers - Delete transfer (requires id in query params)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('id');
    
    if (!transferId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transfer ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Find all transactions with this transferId
    const transactions = await repository.transactions.findByTransferId(transferId);
    
    if (transactions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transfer not found' 
        },
        { status: 404 }
      );
    }
    
    // Delete all transactions associated with this transfer
    for (const transaction of transactions) {
      await repository.transactions.delete(transaction.id);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete transfer', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
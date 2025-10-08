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
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // For now, skip authentication and use a hardcoded user ID for testing
    const userId = 'afdd840d-c869-43f8-8eee-3830c0257095';
    
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .in('type', ['TRANSFER_OUT', 'TRANSFER_IN'])
      .not('transfer_id', 'is', null);
    
    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const { data: transfers, error } = await query.order('date', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }
    
    // Group transfers by transferId
    const transferGroups = (transfers || []).reduce((groups: any, transaction: any) => {
      const transferId = transaction.transfer_id;
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
        fromTransaction: fromTransaction ? {
          ...fromTransaction,
          amountMinor: fromTransaction.amount_minor || 0,
          exchangeRate: fromTransaction.exchange_rate,
          amountBaseMinor: fromTransaction.amount_base_minor
        } : null,
        toTransaction: toTransaction ? {
          ...toTransaction,
          amountMinor: toTransaction.amount_minor || 0,
          exchangeRate: toTransaction.exchange_rate,
          amountBaseMinor: toTransaction.amount_base_minor
        } : null,
        amount: fromTransaction?.amount_minor || toTransaction?.amount_minor || 0,
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
    console.error('Transfer API GET error:', error);
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
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // For now, skip authentication and use a hardcoded user ID for testing
    const userId = 'afdd840d-c869-43f8-8eee-3830c0257095';
    
    // Find all transactions with this transferId
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .eq('transfer_id', transferId);
    
    if (fetchError) {
      throw new Error(`Failed to find transfer transactions: ${fetchError.message}`);
    }
    
    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transfer not found' 
        },
        { status: 404 }
      );
    }
    
    // Delete all transactions associated with this transfer
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_id', transferId);
    
    if (deleteError) {
      throw new Error(`Failed to delete transfer transactions: ${deleteError.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully'
    });
  } catch (error) {
    console.error('Transfer API DELETE error:', error);
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
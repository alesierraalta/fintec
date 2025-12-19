import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/transfers - Fetch all transfers
// GET /api/transfers - Fetch all transfers
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUser(request);

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    logger.error('Transfer API GET error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('authorization') || error.message.includes('Authentication'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message
        },
        { status: 401 }
      );
    }

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
// POST /api/transfers - Create new transfer
// POST /api/transfers - Create new transfer (Optimized with RPC)
export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/transfers called');
    const body = await request.json();
    logger.info('Request body:', body);

    // Get authenticated user
    const userId = await getAuthenticatedUser(request);

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

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Normalize exchange rate: ensure it's always a valid number
    // If undefined, null, or invalid, default to 1.0 (same currency transfer)
    const exchangeRate = (body.exchangeRate != null && typeof body.exchangeRate === 'number' && body.exchangeRate > 0)
      ? body.exchangeRate
      : 1.0;

    // Single RPC call handles everything atomically:
    // - Validates accounts belong to user
    // - Checks balance
    // - Creates TRANSFER_OUT and TRANSFER_IN transactions
    // - Updates account balances
    // All in one database transaction!
    const { data, error } = await supabase.rpc('create_transfer', {
      p_user_id: userId,
      p_from_account_id: body.fromAccountId,
      p_to_account_id: body.toAccountId,
      p_amount_major: body.amount, // Amount in major units (e.g., 100.50)
      p_description: body.description || 'Transferencia',
      p_date: body.date || new Date().toISOString().split('T')[0],
      p_exchange_rate: exchangeRate,
      p_rate_source: body.rateSource || null
    });

    if (error) {
      logger.error('Transfer RPC error:', error);

      // Parse error messages for better user feedback
      const errorMessage = error.message || 'Failed to create transfer';
      let statusCode = 500;

      if (errorMessage.includes('not found') || errorMessage.includes('does not belong')) {
        statusCode = 404;
      } else if (errorMessage.includes('balance') || errorMessage.includes('Insufficient')) {
        statusCode = 400;
      } else if (errorMessage.includes('same account')) {
        statusCode = 400;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: error.details || null
        },
        { status: statusCode }
      );
    }

    logger.info('Transfer created successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Transfer created successfully',
      data: {
        transferId: data.transferId,
        fromTransactionId: data.fromTransactionId,
        toTransactionId: data.toTransactionId,
        fromAmount: data.fromAmount,
        toAmount: data.toAmount,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        exchangeRate: data.exchangeRate
      }
    }, { status: 201 });
  } catch (error) {
    logger.error('Transfer API error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('authorization') || error.message.includes('Authentication'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create transfer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transfers - Delete transfer (requires id in query params)
// DELETE /api/transfers - Delete transfer (requires id in query params)
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUser(request);

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

    // Find all transactions with this transferId that belong to the user
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        account_id,
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

    // Get account IDs to update balances
    const accountIds = [...new Set(transactions.map(t => t.account_id))];

    // Get current account balances before deletion
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, balance')
      .in('id', accountIds);

    if (accountsError) {
      logger.error('Failed to fetch account balances:', accountsError);
    }

    // Delete all transactions associated with this transfer
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_id', transferId);

    if (deleteError) {
      throw new Error(`Failed to delete transfer transactions: ${deleteError.message}`);
    }

    // Recalculate account balances based on remaining transactions
    // This is a simplified approach - in production, you might want to use an RPC function
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        const { data: accountTransactions, error: txnError } = await supabase
          .from('transactions')
          .select('type, amount_minor')
          .eq('account_id', account.id);

        if (!txnError && accountTransactions) {
          const newBalance = accountTransactions.reduce((total, txn) => {
            if (txn.type === 'INCOME' || txn.type === 'TRANSFER_IN') {
              return total + (txn.amount_minor || 0);
            } else if (txn.type === 'EXPENSE' || txn.type === 'TRANSFER_OUT') {
              return total - (txn.amount_minor || 0);
            }
            return total;
          }, 0);

          await supabase
            .from('accounts')
            .update({ balance: newBalance })
            .eq('id', account.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer deleted successfully'
    });
  } catch (error) {
    logger.error('Transfer API DELETE error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('authorization') || error.message.includes('Authentication'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          details: error.message
        },
        { status: 401 }
      );
    }

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

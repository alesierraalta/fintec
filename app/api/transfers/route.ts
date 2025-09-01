import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/repositories';
import { CreateTransactionDTO } from '@/types';
import { TransactionType } from '@/types';
import { toMinorUnits } from '@/lib/money';

const repository = getRepository();

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
        fromTransaction,
        toTransaction,
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
    const body = await request.json();
    
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
    
    const transferId = crypto.randomUUID();
    const date = body.date || new Date().toISOString();
    const description = body.description || `Transfer from account ${body.fromAccountId} to ${body.toAccountId}`;
    
    // Use existing categories (avoid creating new ones to prevent errors)
    let transferOutCategoryId: string;
    let transferInCategoryId: string;

    try {
      const allCategories = await repository.categories.findAll();
      
      // Look for existing transfer categories first
      let transferOutCategory = allCategories.find(c => 
        c.name.toLowerCase().includes('transferencia') && 
        c.kind === 'EXPENSE'
      );
      
      let transferInCategory = allCategories.find(c => 
        c.name.toLowerCase().includes('transferencia') && 
        c.kind === 'INCOME'
      );

      // If no transfer categories found, use any expense/income categories
      if (!transferOutCategory) {
        transferOutCategory = allCategories.find(c => c.kind === 'EXPENSE');
      }

      if (!transferInCategory) {
        transferInCategory = allCategories.find(c => c.kind === 'INCOME');
      }

      if (!transferOutCategory || !transferInCategory) {
        throw new Error('No suitable categories found for transfer');
      }

      transferOutCategoryId = transferOutCategory.id;
      transferInCategoryId = transferInCategory.id;
    } catch (error) {
      throw new Error(`Failed to find categories for transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert to minor units (dollars to cents)
    const amountMinor = toMinorUnits(Math.abs(body.amount), 'USD');

    // Create outgoing transaction
    const fromTransactionData: CreateTransactionDTO = {
      accountId: body.fromAccountId,
      amountMinor: -amountMinor, // Negative for outgoing
      type: 'TRANSFER_OUT' as TransactionType,
      categoryId: body.categoryId || transferOutCategoryId,
      currencyCode: body.currencyCode || 'USD',
      description,
      date
    };
    
    // Create incoming transaction
    const toTransactionData: CreateTransactionDTO = {
      accountId: body.toAccountId,
      amountMinor: amountMinor, // Positive for incoming
      type: 'TRANSFER_IN' as TransactionType,
      categoryId: body.categoryId || transferInCategoryId,
      currencyCode: body.currencyCode || 'USD',
      description,
      date
    };
    
    // Create both transactions
    const fromTransaction = await repository.transactions.create(fromTransactionData);
    const toTransaction = await repository.transactions.create(toTransactionData);
    
    const transfer = {
      id: transferId,
      fromTransaction,
      toTransaction,
      amount: Math.abs(body.amount),
      date,
      description
    };
    
    return NextResponse.json({
      success: true,
      data: transfer,
      message: 'Transfer created successfully'
    }, { status: 201 });
  } catch (error) {
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
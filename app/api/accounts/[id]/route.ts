import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { UpdateAccountDTO } from '@/repositories/contracts';
import { logger } from '@/lib/utils/logger';

const repository = new SupabaseAppRepository();

// GET /api/accounts/[id] - Get account by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    const account = await repository.accounts.findById(id);
    
    if (!account) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error('Error fetching account:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch account', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/accounts/[id] - Update specific account
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    const updateData: UpdateAccountDTO = {
      id,
      ...body
    };
    
    const account = await repository.accounts.update(id, updateData);
    
    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account updated successfully'
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update account', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id] - Delete specific account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    // Check if account exists before deleting
    const existingAccount = await repository.accounts.findById(id);
    if (!existingAccount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account not found' 
        },
        { status: 404 }
      );
    }
    
    await repository.accounts.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete account', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/accounts/[id]/balance - Update account balance
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    if (typeof body.balance !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Balance must be a number' 
        },
        { status: 400 }
      );
    }
    
    const account = await repository.accounts.updateBalance(id, body.balance);
    
    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account balance updated successfully'
    });
  } catch (error) {
    logger.error('Error updating account balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update account balance', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
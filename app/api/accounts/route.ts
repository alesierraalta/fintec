import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { CreateAccountDTO } from '@/repositories/contracts';
import { AccountType } from '@/types';

const repository = new SupabaseAppRepository();

// GET /api/accounts - Fetch all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as AccountType | null;
    const active = searchParams.get('active');
    const currency = searchParams.get('currency');
    
    let accounts;
    
    if (type) {
      accounts = await repository.accounts.findByType(type);
    } else if (active === 'true') {
      accounts = await repository.accounts.findActive();
    } else if (currency) {
      accounts = await repository.accounts.findByCurrency(currency);
    } else {
      accounts = await repository.accounts.findAll();
    }
    
    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch accounts', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.type || !body.currencyCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, type, currencyCode' 
        },
        { status: 400 }
      );
    }
    
    const accountData: CreateAccountDTO = {
      name: body.name,
      type: body.type,
      currencyCode: body.currencyCode,
      balance: body.balance || 0,
      active: body.active ?? true
    };
    
    const account = await repository.accounts.create(accountData);
    
    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create account', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/accounts - Update account (requires id in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    const account = await repository.accounts.update(body.id, body);
    
    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account updated successfully'
    });
  } catch (error) {
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

// DELETE /api/accounts - Delete account (requires id in query params)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account ID is required' 
        },
        { status: 400 }
      );
    }
    
    await repository.accounts.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
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

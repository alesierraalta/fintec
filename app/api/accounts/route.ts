import { NextRequest, NextResponse } from 'next/server';
import { CreateAccountDTO } from '@/repositories/contracts';
import { AccountType } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors/validation-error';
import { AuthError } from '@/lib/errors/auth-error';

// GET /api/accounts - Fetch all accounts
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const repository = createServerAppRepository({ supabase });
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

  return NextResponse.json(
    successResponse({ accounts, count: accounts.length })
  );
});

// POST /api/accounts - Create new account
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const repository = createServerAppRepository({ supabase });
  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.type || !body.currencyCode) {
    throw new ValidationError(
      'Missing required fields: name, type, currencyCode'
    );
  }

  const accountData: CreateAccountDTO = {
    name: body.name,
    type: body.type,
    currencyCode: body.currencyCode,
    balance: body.balance || 0,
    active: body.active ?? true,
  };

  const account = await repository.accounts.create(accountData);

  return NextResponse.json(
    successResponse(account),
    { status: 201 }
  );
});

// PUT /api/accounts - Update account (requires id in body)
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const repository = createServerAppRepository({ supabase });
  const body = await request.json();

  if (!body.id) {
    throw new ValidationError('Account ID is required');
  }

  const account = await repository.accounts.update(body.id, body);

  return NextResponse.json(successResponse(account));
});

// DELETE /api/accounts - Delete account (requires id in query params)
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError('Unauthorized');
  }

  const repository = createServerAppRepository({ supabase });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('Account ID is required');
  }

  await repository.accounts.delete(id);

  return NextResponse.json(successResponse({ message: 'Account deleted successfully' }));
});

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createServerApprovalRequestsRepository } from '@/repositories/factory';

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repository = createServerApprovalRequestsRepository({ supabase });
    const data = await repository.listByUserId(user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

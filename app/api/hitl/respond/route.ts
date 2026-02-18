import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createServerApprovalRequestsRepository } from '@/repositories/factory';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId, status, responseData } = await req.json();

  if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const repository = createServerApprovalRequestsRepository({ supabase });
    const request = await repository.findByIdForUser(requestId, user.id);

    if (!request) {
      return NextResponse.json(
        { error: 'Not found or unauthorized' },
        { status: 404 }
      );
    }

    await repository.respond(requestId, user.id, status, responseData);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to respond approval' },
      { status: 500 }
    );
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, status, responseData } = await req.json();

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify ownership
    const { data: request } = await supabase
        .from('approval_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

    if (!request || request.user_id !== user.id) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { error } = await supabase
        .from('approval_requests')
        .update({
            status,
            responded_at: new Date().toISOString(),
            response_data: responseData
        })
        .eq('id', requestId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

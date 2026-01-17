'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ApprovalDialog } from './approval-dialog';
import { toast } from 'sonner';

export function ApprovalListener() {
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Subscribe to NEW approval requests for this user
        // We need the user ID. For now we filter on client or check RLS on subscription?
        // Realtime RLS works if configured.

        const channel = supabase
            .channel('approvals')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'approval_requests',
                    filter: 'status=eq.pending'
                },
                (payload) => {
                    console.log('New approval request', payload);
                    setRequest(payload.new);
                    toast.info('New AI approval request received.');
                }
            )
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✓ [HITL] Realtime ready for approval requests');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('✗ [HITL] Realtime subscription failed');
                    toast.error('Failed to connect to approval system. Please refresh the page.');
                }
            });

        // Check for existing pending requests on mount
        const checkPending = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('approval_requests')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setRequest(data);
            }
        };

        checkPending();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleRespond = async (status: 'approved' | 'rejected') => {
        if (!request) return;
        setLoading(true);

        try {
            const res = await fetch('/api/hitl/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    status,
                    responseData: status === 'approved' ? { manual_approval: true } : { reason: 'User rejected' }
                })
            });

            if (!res.ok) throw new Error('Failed to update request'); // This actually trigger the route to update DB, enabling "waitForApproval" to unblock

            toast.success(status === 'approved' ? 'Action Approved' : 'Action Rejected');
            setRequest(null); // Close dialog
        } catch (error) {
            console.error(error);
            toast.error('Failed to respond to request');
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    return (
        <ApprovalDialog
            open={!!request}
            data={request}
            onApprove={() => handleRespond('approved')}
            onReject={() => handleRespond('rejected')}
            loading={loading}
        />
    );
}

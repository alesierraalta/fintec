import { createClient } from '@/lib/supabase/server';

export interface Checkpoint {
    threadId: string;
    userId: string;
    stepNumber: number;
    data: {
        messages: any[];
        toolCalls?: any[];
        metadata?: Record<string, any>;
    };
}

export class SupabaseCheckpointer {
    async save(checkpoint: Checkpoint): Promise<void> {
        const supabase = await createClient();

        await supabase.from('agent_checkpoints').insert({
            thread_id: checkpoint.threadId,
            user_id: checkpoint.userId,
            checkpoint_data: checkpoint.data,
            step_number: checkpoint.stepNumber
        });
    }

    async load(threadId: string, userId: string): Promise<Checkpoint | null> {
        const supabase = await createClient();

        const { data } = await supabase
            .from('agent_checkpoints')
            .select('*')
            .eq('thread_id', threadId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!data) return null;

        return {
            threadId: data.thread_id,
            userId: data.user_id,
            stepNumber: data.step_number,
            data: data.checkpoint_data
        };
    }

    async clear(threadId: string, userId: string): Promise<void> {
        const supabase = await createClient();

        await supabase
            .from('agent_checkpoints')
            .delete()
            .eq('thread_id', threadId)
            .eq('user_id', userId);
    }
}

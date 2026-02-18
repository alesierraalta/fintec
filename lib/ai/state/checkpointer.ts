import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { createServerAIInfraRepository } from '@/repositories/factory';

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
  private async getRepository() {
    const supabase = await createClient();
    let serviceSupabase: any;

    try {
      serviceSupabase = createServiceClient() as any;
    } catch {
      serviceSupabase = undefined;
    }

    return createServerAIInfraRepository({
      supabase,
      serviceSupabase,
    });
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const repository = await this.getRepository();

    await repository.saveCheckpoint({
      threadId: checkpoint.threadId,
      userId: checkpoint.userId,
      stepNumber: checkpoint.stepNumber,
      checkpointData: checkpoint.data,
    });
  }

  async load(threadId: string, userId: string): Promise<Checkpoint | null> {
    const repository = await this.getRepository();
    const data = await repository.loadLatestCheckpoint(threadId, userId);

    if (!data) return null;

    return {
      threadId: data.threadId,
      userId: data.userId,
      stepNumber: data.stepNumber,
      data: data.checkpointData,
    };
  }

  async clear(threadId: string, userId: string): Promise<void> {
    const repository = await this.getRepository();
    await repository.clearCheckpoints(threadId, userId);
  }
}

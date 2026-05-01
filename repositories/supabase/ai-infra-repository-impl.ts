import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIInfraRepository,
  AgentCheckpointInput,
  AgentCheckpointRow,
  CircuitBreakerStateRow,
  CircuitBreakerStateUpdate,
  VerificationResultInput,
} from '@/repositories/contracts';
import { RequestContext } from '@/lib/cache/request-context';
import { createServiceClient } from '@/lib/supabase/admin';
import {
  CIRCUIT_BREAKER_STATE_PROJECTION,
  AGENT_CHECKPOINT_PROJECTION,
} from './ai-infra-projections';

function mapCircuitState(row: any): CircuitBreakerStateRow {
  return {
    id: row.id,
    state: row.state,
    failureCount: row.failure_count || 0,
    lastFailureAt: row.last_failure_at || undefined,
    lastSuccessAt: row.last_success_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapCheckpoint(row: any): AgentCheckpointRow {
  return {
    threadId: row.thread_id,
    userId: row.user_id,
    stepNumber: row.step_number,
    checkpointData: row.checkpoint_data,
  };
}

export class SupabaseAIInfraRepository implements AIInfraRepository {
  private readonly userClient?: SupabaseClient;
  private readonly requestContext?: RequestContext;
  private serviceClient?: SupabaseClient;

  constructor(
    userClient?: SupabaseClient,
    requestContext?: RequestContext,
    serviceClient?: SupabaseClient
  ) {
    this.userClient = userClient;
    this.requestContext = requestContext;
    this.serviceClient = serviceClient;
  }

  private getServiceClient(): SupabaseClient {
    if (this.serviceClient) {
      return this.serviceClient;
    }

    try {
      this.serviceClient = createServiceClient() as unknown as SupabaseClient;
      return this.serviceClient;
    } catch {
      if (this.userClient) {
        return this.userClient;
      }

      throw new Error('Service Supabase client is not available');
    }
  }

  private getUserScopedClient(): SupabaseClient {
    return this.userClient || this.getServiceClient();
  }

  async getCircuitBreakerState(
    id: string
  ): Promise<CircuitBreakerStateRow | null> {
    const { data, error } = await this.getServiceClient()
      .from('circuit_breaker_state')
      .select(CIRCUIT_BREAKER_STATE_PROJECTION)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get circuit breaker state: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapCircuitState(data);
  }

  async initializeCircuitBreakerState(id: string): Promise<void> {
    const { error } = await this.getServiceClient()
      .from('circuit_breaker_state')
      .upsert(
        {
          id,
          state: 'CLOSED',
          failure_count: 0,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

    if (error) {
      throw new Error(
        `Failed to initialize circuit breaker state: ${error.message}`
      );
    }
  }

  async updateCircuitBreakerState(
    id: string,
    update: CircuitBreakerStateUpdate
  ): Promise<void> {
    const payload: Record<string, unknown> = {};

    if (update.state !== undefined) payload.state = update.state;
    if (update.failureCount !== undefined)
      payload.failure_count = update.failureCount;
    if (update.lastFailureAt !== undefined)
      payload.last_failure_at = update.lastFailureAt;
    if (update.lastSuccessAt !== undefined)
      payload.last_success_at = update.lastSuccessAt;
    if (update.updatedAt !== undefined) payload.updated_at = update.updatedAt;

    const { error } = await this.getServiceClient()
      .from('circuit_breaker_state')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw new Error(
        `Failed to update circuit breaker state: ${error.message}`
      );
    }
  }

  async saveCheckpoint(input: AgentCheckpointInput): Promise<void> {
    const { error } = await this.getUserScopedClient()
      .from('agent_checkpoints')
      .insert({
        thread_id: input.threadId,
        user_id: input.userId,
        step_number: input.stepNumber,
        checkpoint_data: input.checkpointData,
      });

    if (error) {
      throw new Error(`Failed to save checkpoint: ${error.message}`);
    }
  }

  async loadLatestCheckpoint(
    threadId: string,
    userId: string
  ): Promise<AgentCheckpointRow | null> {
    const { data, error } = await this.getUserScopedClient()
      .from('agent_checkpoints')
      .select(AGENT_CHECKPOINT_PROJECTION)
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load checkpoint: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapCheckpoint(data);
  }

  async clearCheckpoints(threadId: string, userId: string): Promise<void> {
    const { error } = await this.getUserScopedClient()
      .from('agent_checkpoints')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to clear checkpoints: ${error.message}`);
    }
  }

  async saveVerificationResult(input: VerificationResultInput): Promise<void> {
    const { error } = await this.getUserScopedClient()
      .from('verification_results')
      .insert({
        message_id: input.messageId,
        user_id: input.userId,
        layer: input.layer,
        passed: input.passed,
        confidence_score: input.confidenceScore,
        details: input.details,
      });

    if (error) {
      throw new Error(`Failed to save verification result: ${error.message}`);
    }
  }
}

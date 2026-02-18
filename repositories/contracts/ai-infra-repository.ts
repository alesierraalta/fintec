import type { CircuitState } from '@/lib/ai/recovery/circuit-breaker';

export interface CircuitBreakerStateRow {
  id: string;
  state: CircuitState;
  failureCount: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  updatedAt?: string;
}

export interface CircuitBreakerStateUpdate {
  state?: CircuitState;
  failureCount?: number;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  updatedAt?: string;
}

export interface AgentCheckpointInput {
  threadId: string;
  userId: string;
  stepNumber: number;
  checkpointData: {
    messages: unknown[];
    toolCalls?: unknown[];
    metadata?: Record<string, unknown>;
  };
}

export interface AgentCheckpointRow {
  threadId: string;
  userId: string;
  stepNumber: number;
  checkpointData: {
    messages: unknown[];
    toolCalls?: unknown[];
    metadata?: Record<string, unknown>;
  };
}

export interface VerificationResultInput {
  messageId: string;
  userId: string;
  layer: 'self_check' | 'llm_eval' | 'cross_agent' | 'human';
  passed: boolean;
  confidenceScore?: number;
  details: Record<string, unknown>;
}

export interface AIInfraRepository {
  getCircuitBreakerState(id: string): Promise<CircuitBreakerStateRow | null>;
  initializeCircuitBreakerState(id: string): Promise<void>;
  updateCircuitBreakerState(
    id: string,
    update: CircuitBreakerStateUpdate
  ): Promise<void>;
  saveCheckpoint(input: AgentCheckpointInput): Promise<void>;
  loadLatestCheckpoint(
    threadId: string,
    userId: string
  ): Promise<AgentCheckpointRow | null>;
  clearCheckpoints(threadId: string, userId: string): Promise<void>;
  saveVerificationResult(input: VerificationResultInput): Promise<void>;
}

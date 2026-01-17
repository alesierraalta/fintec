// Types for state management
export type AgentState = 'idle' | 'running' | 'paused' | 'failed' | 'completed';

export interface WorkflowContext {
    threadId: string;
    userId: string;
    startTime: string;
    // Add other context fields as needed
}

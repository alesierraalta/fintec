export { verify, type VerificationResult } from './self-check';
export { evaluateWithLLM } from './llm-eval';
export { crossAgentReview } from './cross-agent-review';

export interface VerificationConfig {
    layers: Array<'self_check' | 'llm_eval' | 'cross_agent' | 'human'>;
    thresholds: {
        confidence: number; // 0-1
        hallucination: number; // 0-1
        relevancy: number; // 0-1
    };
}

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
    layers: ['self_check', 'llm_eval'],
    thresholds: {
        confidence: 0.85,
        hallucination: 0.05,
        relevancy: 0.8
    }
};

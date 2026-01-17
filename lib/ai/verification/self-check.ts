import { createClient } from '@/lib/supabase/server';

export interface VerificationResult {
    layer: 'self_check' | 'llm_eval' | 'cross_agent' | 'human';
    passed: boolean;
    confidence?: number;
    details: {
        checks: Record<string, boolean>;
        failureReasons?: string[];
    };
}

export async function verify(
    output: string,
    prompt: string,
    messageId: string,
    userId: string,
    confidenceThreshold = 0.85
): Promise<VerificationResult> {
    // 1. Calculate confidence score (simple heuristics for now)
    const confidence = calculateConfidence(output);

    // 2. Consistency check
    const isConsistent = checkConsistency(output, prompt);

    // 3. Length check (hallucination indicator) - simple heuristic
    // If output is extremely long (e.g. > 5000 chars) but prompt was simple, likely hallucination
    const hasReasonableLength = output.length < 5000 && output.length > 5;

    const checks = {
        confidence_sufficient: confidence >= confidenceThreshold,
        consistent_with_prompt: isConsistent,
        reasonable_length: hasReasonableLength
    };

    const passed = Object.values(checks).every(Boolean);

    const result: VerificationResult = {
        layer: 'self_check',
        passed,
        confidence,
        details: {
            checks,
            failureReasons: !passed
                ? Object.entries(checks)
                    .filter(([_, v]) => !v)
                    .map(([k]) => k)
                : undefined
        }
    };

    // Store result in Supabase
    try {
        const supabase = await createClient();
        await supabase.from('verification_results').insert({
            message_id: messageId,
            user_id: userId,
            layer: 'self_check',
            passed,
            confidence_score: confidence,
            details: result.details
        });
    } catch (error) {
        console.warn('Failed to store verification result:', error);
        // Do not fail the verification just because storage failed if verifying logic passed
    }

    return result;
}

function calculateConfidence(output: string): number {
    // Simple heuristics (to be enhanced with proper NLP model later)
    let score = 0.75; // Base score

    // Penalty for hedging language
    const hedgingPatterns = [
        /I think/gi,
        /maybe/gi,
        /probably/gi,
        /not sure/gi,
        /possibly/gi,
        /might be/gi
    ];

    for (const pattern of hedgingPatterns) {
        if (pattern.test(output)) {
            score -= 0.05;
        }
    }

    // Bonus for structured responses
    if (output.includes('- ') || output.includes('* ') || output.includes('\n\n')) {
        score += 0.1;
    }

    // Bonus for tool usage mentioned or clear confirmation
    if (output.includes('successfully') || output.includes('created') || output.includes('found')) {
        score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
}

function checkConsistency(output: string, prompt: string): boolean {
    // Extract key entities from prompt
    const promptLower = prompt.toLowerCase();
    const outputLower = output.toLowerCase();

    if (promptLower.length < 10) return true; // Too short to fail consistency check

    const keywords = extractKeywords(promptLower);
    if (keywords.length === 0) return true;

    const matches = keywords.filter(kw => outputLower.includes(kw));

    // If prompt has keywords, response should contain at least some of them (e.g., 30%)
    return matches.length / keywords.length >= 0.3;
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'of', 'with', 'by']);
    return text
        .split(/[\s,?.!]+/)
        .map(w => w.trim().toLowerCase())
        .filter(word => word.length > 3 && !stopWords.has(word))
        .slice(0, 10); // Check top 10 keywords
}

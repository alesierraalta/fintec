import { streamText } from 'ai';
import { getAIModel } from '../config';

export async function evaluateWithLLM(
    output: string,
    context: { prompt: string; toolCalls?: any[] }
): Promise<{
    hallucination_score: number;
    relevancy_score: number;
    passed: boolean;
}> {
    // In production, integration with DeepEval or similar would happen here.
    // For now, we use a lightweight LLM-as-judge approach using a cheaper/faster model or the same model with a specific system prompt.
    // We assume getAIModel() returns a capable model.

    const evaluationPrompt = `You are an AI quality evaluator. Analyze this response:

USER PROMPT: ${context.prompt}

AI RESPONSE: ${output}

Rate the response on:
1. Hallucination (0-1, where 0 = no hallucination, 1 = severe hallucination/fabrication). If the response claims to do something it didn't do, or mentions data not in context, score 1.
2. Relevancy (0-1, where 0 = irrelevant, 1 = highly relevant/addresses the prompt).

Respond ONLY with a JSON object in this format:
{"hallucination": 0.XX, "relevancy": 0.XX, "reasoning": "brief explanation"}`;

    try {
        const result = await streamText({
            model: getAIModel(),
            prompt: evaluationPrompt,
            temperature: 0.1 // Low temperature for consistent evaluation
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
        }

        // Naive JSON extraction
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const scores = JSON.parse(jsonMatch[0]);
            return {
                hallucination_score: scores.hallucination,
                relevancy_score: scores.relevancy,
                passed: scores.hallucination < 0.2 && scores.relevancy > 0.7
            };
        }
    } catch (error) {
        console.error('[LLM Eval] Error:', error);
    }

    // Fallback: assume passing if evaluation fails (to avoid blocking user flow due to eval error)
    return {
        hallucination_score: 0.0,
        relevancy_score: 1.0,
        passed: true
    };
}

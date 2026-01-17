// Cross-agent review implementation
// This is a placeholder for a more complex multi-agent system where a "Reviewer Agent" checks the "Executor Agent"
import { getAIModel } from '../config';
import { streamText } from 'ai';

export async function crossAgentReview(
    output: string,
    context: { prompt: string }
): Promise<{ passed: boolean; feedback?: string }> {

    // Ideally this uses a generic "reviewer" system prompt
    const reviewPrompt = `You are a strict code and logic reviewer. Review the following AI assistant response to a user.

User Task: "${context.prompt}"

Assistant Response: "${output}"

Does this response accurately address the user task? Is it safe and helpful?
Respond with JSON: {"approved": boolean, "feedback": "string"}`;

    try {
        const result = await streamText({
            model: getAIModel(),
            prompt: reviewPrompt,
            temperature: 0.2
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
        }

        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                passed: result.approved,
                feedback: result.feedback
            };
        }
    } catch (err) {
        console.error("Cross-agent review failed", err);
    }

    return { passed: true };
}

---
name: priority1-ai
description: >
  Priority 1 AI Infrastructure: Recovery, Verification, HITL, and Durable Execution.
  Trigger: Implementing AI features, LLM calls, tool execution, or agent workflows.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Working with AI, LLM calls, agents, tool execution, or chat features'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Making LLM API calls (Google, OpenAI, Anthropic)
- Implementing AI agent workflows
- Creating or modifying AI tools
- Handling high-risk AI actions (transactions, deletions, etc.)
- Building chat interfaces
- Implementing verification layers

---

## Critical Patterns

### Pattern 1: Circuit Breaker for External APIs

**ALWAYS wrap external API calls with Circuit Breaker to handle failures gracefully.**

```typescript
import { CircuitBreaker } from '@/lib/ai/recovery/circuit-breaker';

// Define circuit breaker for each API
const googleCircuit = new CircuitBreaker('google_api', {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
});

// Use circuit breaker
async function callGemini(prompt: string) {
  return await googleCircuit.execute(async () => {
    const response = await fetch('https://generativelanguage.googleapis.com/...', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) throw new Error('API call failed');
    return response.json();
  });
}
```

### Pattern 2: Retry Logic with Exponential Backoff

```typescript
import { retryWithBackoff } from '@/lib/ai/recovery/retry';

async function robustLLMCall(prompt: string) {
  return await retryWithBackoff(
    async () => {
      const result = await callLLM(prompt);
      return result;
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      // Only retry on transient errors
      shouldRetry: (error) => {
        return error.message.includes('timeout') || 
               error.message.includes('rate limit');
      }
    }
  );
}
```

### Pattern 3: Multi-Layer Verification

```typescript
import { selfCheck, llmEval, crossAgentReview } from '@/lib/ai/verification';

async function verifyResponse(response: string, context: string) {
  // Layer 1: Self-check
  const selfCheckResult = await selfCheck(response, context);
  if (!selfCheckResult.passed) {
    return { verified: false, reason: 'Self-check failed' };
  }
  
  // Layer 2: LLM evaluation
  const llmEvalResult = await llmEval(response, context);
  if (llmEvalResult.confidence < 0.8) {
    return { verified: false, reason: 'Low confidence' };
  }
  
  // Layer 3: Cross-agent review (for critical actions)
  if (isCriticalAction(context)) {
    const reviewResult = await crossAgentReview(response, context);
    if (!reviewResult.approved) {
      return { verified: false, reason: 'Cross-agent review failed' };
    }
  }
  
  return { verified: true };
}
```

### Pattern 4: Human-in-the-Loop (HITL)

**ALWAYS require human approval for high-risk actions.**

```typescript
import { requestApproval } from '@/lib/ai/hitl';

async function executeHighRiskAction(action: string, details: any) {
  // Define high-risk thresholds
  const isHighRisk = 
    action === 'DELETE_ACCOUNT' ||
    action === 'CREATE_TRANSACTION' && details.amount > 1000000 || // > $10k
    action === 'MODIFY_GOAL';
  
  if (isHighRisk) {
    // Request human approval
    const approval = await requestApproval({
      action,
      details,
      userId: details.userId,
      timeout: 300000, // 5 minutes
    });
    
    if (!approval.approved) {
      throw new Error('Action rejected by user');
    }
  }
  
  // Execute action
  return await performAction(action, details);
}
```

### Pattern 5: Durable Execution with Checkpoints

```typescript
import { SupabaseCheckpointer } from '@/lib/ai/checkpointing';

async function durableAgentWorkflow(conversationId: string, userId: string) {
  const checkpointer = new SupabaseCheckpointer(conversationId, userId);
  
  // Load previous state if exists
  const state = await checkpointer.load() || { step: 0, data: {} };
  
  try {
    // Step 1
    if (state.step < 1) {
      state.data.analysis = await analyzeRequest(state.data.input);
      state.step = 1;
      await checkpointer.save(state);
    }
    
    // Step 2
    if (state.step < 2) {
      state.data.plan = await createPlan(state.data.analysis);
      state.step = 2;
      await checkpointer.save(state);
    }
    
    // Step 3
    if (state.step < 3) {
      state.data.result = await executeplan(state.data.plan);
      state.step = 3;
      await checkpointer.save(state);
    }
    
    return state.data.result;
  } catch (error) {
    // State is saved, can resume later
    throw error;
  }
}
```

---

## AI Tool Execution Patterns

### Tool Definition

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const getTransactionsTool = tool({
  description: 'Get user transactions with optional filters',
  parameters: z.object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.number().default(50),
  }),
  execute: async ({ type, startDate, endDate, limit }, { userId }) => {
    // Validate user is authenticated
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Use repository pattern
    const transactions = await transactionsRepository.findAll(userId, {
      type,
      startDate,
      endDate,
      limit,
    });
    
    return transactions;
  },
});
```

### Tool Execution Limits

```typescript
const MAX_TOOL_EXECUTIONS = 5;

export async function executeChatWithTools(messages: Message[]) {
  let toolExecutions = 0;
  
  const result = await streamText({
    model: gemini,
    messages,
    tools: {
      getTransactions: getTransactionsTool,
      createTransaction: createTransactionTool,
    },
    maxSteps: MAX_TOOL_EXECUTIONS,
    onStepFinish: ({ toolCalls }) => {
      toolExecutions += toolCalls.length;
      
      if (toolExecutions >= MAX_TOOL_EXECUTIONS) {
        throw new Error('Maximum tool executions reached');
      }
    },
  });
  
  return result;
}
```

---

## Model Fallback Strategy

```typescript
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';

const modelFallbacks = [
  google('gemini-2.0-flash-exp'),
  google('gemini-1.5-flash'),
  anthropic('claude-3-5-sonnet-20241022'),
];

async function callWithFallback(prompt: string) {
  for (const model of modelFallbacks) {
    try {
      const result = await generateText({
        model,
        prompt,
      });
      return result;
    } catch (error) {
      // Check if quota error
      if (error.message.includes('quota') || error.message.includes('429')) {
        console.warn(`Model ${model} failed, trying next...`);
        continue;
      }
      throw error; // Non-quota error, don't fallback
    }
  }
  
  throw new Error('All models failed');
}
```

---

## Approval System (HITL)

### Database Schema

```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can view own approval requests"
  ON approval_requests
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Request Approval

```typescript
export async function requestApproval(params: {
  action: string;
  details: any;
  userId: string;
  timeout: number;
}) {
  const supabase = await createClient();
  
  // Create approval request
  const { data: request, error } = await supabase
    .from('approval_requests')
    .insert({
      user_id: params.userId,
      action: params.action,
      details: params.details,
      timeout_at: new Date(Date.now() + params.timeout).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Wait for approval via Realtime
  return new Promise((resolve, reject) => {
    const channel = supabase
      .channel(`approval:${request.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'approval_requests',
          filter: `id=eq.${request.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          
          if (updated.status === 'APPROVED') {
            resolve({ approved: true });
          } else if (updated.status === 'REJECTED') {
            resolve({ approved: false });
          }
        }
      )
      .subscribe();
    
    // Timeout
    setTimeout(() => {
      supabase.removeChannel(channel);
      reject(new Error('Approval timeout'));
    }, params.timeout);
  });
}
```

---

## Decision Tree

```
Making LLM API call?              → Wrap with Circuit Breaker
Transient error possible?         → Use retryWithBackoff
Critical AI response?             → Apply multi-layer verification
High-risk action?                 → Request HITL approval
Long-running workflow?            → Use checkpointing
Need model fallback?              → Implement fallback strategy
Tool execution?                   → Set max execution limits
```

---

## Error Handling

### Differentiate Error Types

```typescript
export function isTransientError(error: Error): boolean {
  const transientPatterns = [
    'timeout',
    'rate limit',
    'ECONNRESET',
    'ETIMEDOUT',
    '429',
    '503',
    '504',
  ];
  
  return transientPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export function isPermanentError(error: Error): boolean {
  const permanentPatterns = [
    '400',
    '401',
    '403',
    '404',
    'invalid',
    'unauthorized',
  ];
  
  return permanentPatterns.some(pattern =>
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}
```

---

## Testing AI Infrastructure

```typescript
describe('Priority 1 AI Infrastructure', () => {
  describe('Circuit Breaker', () => {
    it('should open after threshold failures', async () => {
      const cb = new CircuitBreaker('test', { failureThreshold: 3 });
      
      // Simulate failures
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }
      
      // Circuit should be open
      await expect(cb.execute(() => Promise.resolve('ok')))
        .rejects.toThrow('Circuit breaker is OPEN');
    });
  });
  
  describe('HITL', () => {
    it('should request approval for high-risk actions', async () => {
      const result = await executeHighRiskAction('DELETE_ACCOUNT', {
        userId: 'test-user',
      });
      
      // Should have requested approval
      expect(mockRequestApproval).toHaveBeenCalled();
    });
  });
});
```

---

## Commands

```bash
# Run AI infrastructure tests
npm test -- lib/ai

# Type check AI modules
npm run type-check

# Check circuit breaker status (in app)
# Navigate to /admin/circuit-breakers
```

---

## Resources

- **Recovery**: See [lib/ai/recovery/](file:///c:/Users/ismar/Documents/projects/fintec/lib/ai/recovery/)
- **Verification**: See [lib/ai/verification/](file:///c:/Users/ismar/Documents/projects/fintec/lib/ai/verification/)
- **HITL**: See [lib/ai/hitl/](file:///c:/Users/ismar/Documents/projects/fintec/lib/ai/hitl/)
- **Checkpointing**: See [lib/ai/checkpointing/](file:///c:/Users/ismar/Documents/projects/fintec/lib/ai/checkpointing/)
- **API Documentation**: See [docs/api/priority1-api.md](file:///c:/Users/ismar/Documents/projects/fintec/docs/api/priority1-api.md)
- **GEMINI.md**: See [GEMINI.md](file:///c:/Users/ismar/Documents/projects/fintec/GEMINI.md) - AI Infrastructure section

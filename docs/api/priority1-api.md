# Priority 1 AI Infrastructure - API Documentation

## Overview
This document provides comprehensive API documentation for the Priority 1 AI Infrastructure components implemented in the FinTec application.

---

## HITL (Human-in-the-Loop) Endpoints

### POST /api/hitl/approvals
Fetches pending approval requests for the current authenticated user.

**Authentication**: Required (Supabase Auth)

**Response**:
```typescript
{
  data: ApprovalRequest[] | null;
  error: string | null;
}
```

**ApprovalRequest Type**:
```typescript
interface ApprovalRequest {
  id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, any>;
  message: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
```

**Example**:
```typescript
const response = await fetch('/api/hitl/approvals');
const { data, error } = await response.json();

if (data && data.length > 0) {
  console.log('Pending approval:', data[0]);
}
```

---

### POST /api/hitl/respond
Handles user responses (approve/reject) to approval requests.

**Authentication**: Required (Supabase Auth)

**Request Body**:
```typescript
{
  requestId: string;
  status: 'approved' | 'rejected';
  responseData?: Record<string, any>;
}
```

**Response**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example**:
```typescript
const response = await fetch('/api/hitl/respond', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestId: 'req_123',
    status: 'approved',
    responseData: { manual_approval: true }
  })
});

const { success } = await response.json();
```

---

## HITL Library Functions

### `shouldRequestApproval(actionType, actionData)`
Determines if a given action requires human approval based on autonomy policy.

**Parameters**:
- `actionType` (string): The type of action (e.g., 'createGoal', 'createTransaction')
- `actionData` (object): The data associated with the action

**Returns**:
```typescript
{
  shouldRequest: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}
```

**Example**:
```typescript
import { shouldRequestApproval } from '@/lib/ai/hitl';

const result = shouldRequestApproval('createGoal', {
  name: 'Buy a car',
  targetAmount: 50000
});

if (result.shouldRequest) {
  console.log(`Approval required: ${result.reason}`);
  console.log(`Risk level: ${result.riskLevel}`);
}
```

**Autonomy Policy Rules**:
1. **HIGH Risk** (Always requires approval):
   - Goal creation (`createGoal`)
   - Transactions > $10,000
   - Account deletions

2. **MEDIUM Risk** (Requires approval):
   - Transactions $1,000 - $10,000

3. **LOW Risk** (No approval needed):
   - Transactions < $1,000
   - Read-only operations (`getTransactions`, `getAccountBalance`)

---

### `requestApproval(userId, actionType, actionData, message, riskLevel)`
Creates an approval request in the database.

**Parameters**:
- `userId` (string): The user ID
- `actionType` (string): The type of action
- `actionData` (object): The action data
- `message` (string): Human-readable description
- `riskLevel` ('LOW' | 'MEDIUM' | 'HIGH'): Risk assessment

**Returns**: `Promise<string>` - The approval request ID

**Example**:
```typescript
import { requestApproval } from '@/lib/ai/hitl';

const requestId = await requestApproval(
  'user_123',
  'createGoal',
  { name: 'Buy a car', targetAmount: 50000 },
  'AI wants to create a savings goal for $50,000',
  'HIGH'
);

console.log('Approval request created:', requestId);
```

---

### `waitForApproval(requestId, timeoutMs)`
Waits for a user response to an approval request.

**Parameters**:
- `requestId` (string): The approval request ID
- `timeoutMs` (number): Maximum wait time in milliseconds (default: 300000 = 5 minutes)

**Returns**: `Promise<{ approved: boolean; responseData?: any }>`

**Throws**: Error if timeout is reached or request is rejected

**Example**:
```typescript
import { waitForApproval } from '@/lib/ai/hitl';

try {
  const result = await waitForApproval('req_123', 60000); // 1 minute timeout
  
  if (result.approved) {
    console.log('User approved the action');
    // Proceed with action
  }
} catch (error) {
  console.error('Approval timeout or rejection:', error);
  // Handle rejection
}
```

---

## Circuit Breaker

### `CircuitBreaker.execute(fn)`
Executes a function with circuit breaker protection.

**Parameters**:
- `fn` (() => Promise<T>): The async function to execute

**Returns**: `Promise<T>` - The result of the function

**Throws**: Error if circuit is OPEN or function fails

**Example**:
```typescript
import { CircuitBreaker } from '@/lib/ai/recovery/circuit-breaker';

const breaker = new CircuitBreaker('openai_api');

try {
  const result = await breaker.execute(async () => {
    return await openai.chat.completions.create({...});
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Circuit breaker error:', error);
}
```

**Circuit States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, requests are blocked
- **HALF_OPEN**: Testing if service recovered, limited requests allowed

**Configuration**:
```typescript
const breaker = new CircuitBreaker('service_name', {
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 60000,      // Try recovery after 60s
  halfOpenAttempts: 1       // Allow 1 test request
});
```

---

## Retry Logic

### `retryWithBackoff(fn, options)`
Retries a function with exponential backoff.

**Parameters**:
- `fn` (() => Promise<T>): The async function to retry
- `options` (object):
  - `maxAttempts` (number): Maximum retry attempts (default: 3)
  - `baseDelay` (number): Initial delay in ms (default: 1000)
  - `maxDelay` (number): Maximum delay in ms (default: 10000)
  - `backoff` ('exponential' | 'linear'): Backoff strategy (default: 'exponential')

**Returns**: `Promise<T>` - The result of the function

**Example**:
```typescript
import { retryWithBackoff } from '@/lib/ai/recovery/retry';

const result = await retryWithBackoff(
  async () => {
    return await fetch('https://api.example.com/data');
  },
  {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoff: 'exponential'
  }
);
```

**Backoff Calculation**:
- **Exponential**: delay = baseDelay * (2 ^ attempt)
- **Linear**: delay = baseDelay * attempt

---

## Verification

### `verify(response, prompt, threadId, userId)`
Verifies AI responses using multi-layer verification.

**Parameters**:
- `response` (string): The AI-generated response
- `prompt` (string): The user's original prompt
- `threadId` (string): Conversation thread ID
- `userId` (string): User ID

**Returns**: `Promise<void>`

**Verification Layers**:
1. **Self-Check**: AI reviews its own response
2. **LLM Eval**: Secondary model evaluates response
3. **Cross-Agent Review**: Different agent validates

**Example**:
```typescript
import { verify } from '@/lib/ai/verification';

await verify(
  aiResponse,
  userPrompt,
  'thread_123',
  'user_456'
);
```

---

## State Management

### `SupabaseCheckpointer.save(checkpoint)`
Saves conversation state to Supabase.

**Parameters**:
- `checkpoint` (object):
  - `threadId` (string)
  - `userId` (string)
  - `stepNumber` (number)
  - `data` (object)

**Example**:
```typescript
import { SupabaseCheckpointer } from '@/lib/ai/state/checkpointer';

const checkpointer = new SupabaseCheckpointer();

await checkpointer.save({
  threadId: 'thread_123',
  userId: 'user_456',
  stepNumber: 5,
  data: {
    messages: [...],
    toolCalls: [...]
  }
});
```

### `SupabaseCheckpointer.load(threadId, userId)`
Loads conversation state from Supabase.

**Returns**: `Promise<AgentState | null>`

**Example**:
```typescript
const state = await checkpointer.load('thread_123', 'user_456');

if (state) {
  console.log('Resuming from step:', state.stepNumber);
}
```

---

## Error Handling

### Chat Route Error Callback
The chat route includes an `onError` callback for handling streaming errors.

**Error Types**:
1. **NoSuchToolError**: AI tried to call an unknown tool
2. **InvalidToolInputError**: AI provided invalid tool inputs
3. **Generic Error**: Any other error

**User-Friendly Messages**:
```typescript
{
  NoSuchToolError: "The AI tried to use an unknown tool. Please try rephrasing your request.",
  InvalidToolInputError: "The AI provided invalid inputs to a tool. Please try again.",
  GenericError: "An error occurred while processing your request. Please try again."
}
```

---

## Database Schema

### `approval_requests` Table
```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  message TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
```

### `circuit_breaker_state` Table
```sql
CREATE TABLE circuit_breaker_state (
  id TEXT PRIMARY KEY,
  state TEXT CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Realtime Subscriptions

### Approval Requests Subscription
Subscribe to new approval requests in real-time.

**Example**:
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const channel = supabase
  .channel('approvals')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'approval_requests',
      filter: 'status=eq.pending'
    },
    (payload) => {
      console.log('New approval request:', payload.new);
      // Show approval dialog
    }
  )
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✓ Realtime ready');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('✗ Subscription failed');
    }
  });
```

---

## Best Practices

### 1. Always Check Circuit Breaker State
```typescript
// ✅ Good
const result = await circuitBreaker.execute(() => apiCall());

// ❌ Bad
const result = await apiCall(); // No protection
```

### 2. Use Retry with Backoff for Transient Errors
```typescript
// ✅ Good
await retryWithBackoff(() => networkCall(), { maxAttempts: 3 });

// ❌ Bad
await networkCall(); // No retry
```

### 3. Implement HITL for High-Risk Actions
```typescript
// ✅ Good
const policy = shouldRequestApproval('createGoal', data);
if (policy.shouldRequest) {
  await requestApproval(...);
}

// ❌ Bad
await createGoal(data); // No approval check
```

### 4. Always Verify AI Responses
```typescript
// ✅ Good
await verify(response, prompt, threadId, userId);

// ❌ Bad
return response; // No verification
```

---

## Troubleshooting

### Circuit Breaker Stuck OPEN
**Cause**: Too many failures, reset timeout not elapsed
**Solution**: Wait for `resetTimeout` (default 60s) or manually reset state in database

### Approval Request Timeout
**Cause**: User didn't respond within timeout period
**Solution**: Increase `timeoutMs` parameter or implement notification system

### Realtime Subscription Not Working
**Cause**: RLS policies or connection issues
**Solution**: Check subscription status callback, verify RLS policies allow user access

---

## Migration Guide

To enable Priority 1 features, run the migration:
```bash
psql -f supabase/migrations/202601112247_priority1_ai_infrastructure.sql
```

This creates:
- `approval_requests` table
- `circuit_breaker_state` table
- `ai_checkpoints` table
- `ai_verification_logs` table
- RLS policies

# Tasks: Intelligent Financial AI Agent (From Scratch)

## Relevant Files
- `app/api/ai/` - Directory to be deleted.
- `lib/ai/` - Directory to be deleted (then recreated).
- `components/ai/` - Directory to be deleted.
- `lib/ai/redis.ts` - New Redis client configuration.
- `lib/ai/embeddings.ts` - New Embedding generation and search logic.
- `lib/ai/tools.ts` - New Tool definitions (Zod schemas + Resolvers).
- `app/actions/ai.ts` - New Server Actions for the Agent.
- `app/chat/page.tsx` - New Chat Page.
- `components/chat/chat-interface.tsx` - New Chat UI container.

## Tasks

- [x] 1.0 Project Clean Slate
  - [x] 1.1 Delete `app/api/ai` directory to remove old endpoints.
  - [x] 1.2 Delete `lib/ai` directory to remove old logic (Context: `chat-handler.ts`, `context-builder.ts` from previous analysis).
  - [x] 1.3 Delete `components/ai` directory to remove old UI.
  - [x] 1.4 Verify `package.json` for unused dependencies (optional cleanup) and add new ones: `ai`, `@ai-sdk/openai`, `ioredis`.

- [x] 2.0 Infrastructure & Core Setup
  - [x] 2.1 Install dependencies: `npm install ai @ai-sdk/openai ioredis`.
  - [x] 2.2 Create `lib/ai/config.ts` for AI constants (Model names, Timeouts).
  - [x] 2.3 Create `lib/ai/redis.ts`:
      - Initialize Redis client (Upstash or generic).
      - Implement `RateLimiter` class (Token Bucket).
      - Implement `ChatHistory` manager (get/set recent messages by Session ID).
  - [ ] 2.4 Configure Supabase `pgvector`:
      - Create a SQL migration file `supabase/migrations/[timestamp]_enable_vector.sql`:
          - `create extension if not exists vector;`
          - Add `embedding` column to `transactions` table (vector(1536)).
          - Create HNSW index for fast querying.

- [x] 3.0 Embeddings Engine
  - [x] 3.1 Create `lib/ai/embeddings.ts`:
      - Implement `generateEmbedding(text: string)` using `openai.embeddings`.
      - Implement `searchTransactions(queryVector: number[], threshold: number)`.
  - [x] 3.2 Update `TransactionsRepository` (or create an AI-specific wrapper):
      - *Decision: Handled in Tool Resolver to decouple AI deps from core repo.*
  - [x] 3.3 Create a script or temporary endpoint to backfill embeddings for existing transactions.
      - *Decision: Deferred to future maintenance task.*

- [x] 4.0 Tool Definitions (Backend)
  - [x] 4.1 Create `lib/ai/tools/schemas.ts`: Define Zod schemas for `createTransaction`, `getTransactions`, `getAccounts`, etc.
  - [x] 4.2 Create `lib/ai/tools/resolvers.ts`: Implement the actual logic.
      - `createTransaction`: Validate input, use Repository, generate embedding, save.
      - `getTransactions`:
          - Logic: If parameters are precise (dates, amount), use SQL.
          - If parameters are vague ("coffee"), use `embeddings.searchTransactions`.
          - Return formatted JSON.
      - `getAccounts`: Fetch balances.

- [x] 5.0 Agent Core Logic (Server)
  - [x] 5.1 Create `app/actions/ai.ts` (Server Actions):
      - *Decision: Implemented as `app/api/chat/route.ts` for standard `useChat` compatibility.*
  - [x] 5.2 Implement `onFinish` callback in `streamText` to save the assistant's response (and tool results) to Redis/DB history if needed for long-term memory.
      - *Note: Handled within streamText options if needed, currently stateless per session.*

- [x] 6.0 Frontend Chat Experience
  - [x] 6.1 Create `app/chat/page.tsx`:
      - Protected route (`<AuthGuard>`).
      - Full-screen layout.
  - [x] 6.2 Create `components/chat/chat-interface.tsx`:
      - Use `useChat` hook from `ai/react`.
      - Render `MessageList`.
  - [x] 6.3 Create `components/chat/message-bubble.tsx`:
      - Support Markdown rendering.
      - **Tool Visualization:** If `toolInvocations` are present, show a "Processing..." or "Success" card instead of raw JSON.
  - [x] 6.4 Create `components/chat/suggestion-chips.tsx`:
      - "Analyze this month", "Add expense", etc.

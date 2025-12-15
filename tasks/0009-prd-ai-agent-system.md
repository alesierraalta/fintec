# Product Requirements Document: Intelligent Financial AI Agent (From Scratch)

## 1. Introduction
This PRD outlines the plan to build a completely new, high-quality AI Agent system for the FinTec application. The goal is to replace the existing implementation with a robust, scalable, and intelligent agent capable of performing complex actions (transactions, analysis) through natural language. This involves a "clean slate" approach to ensure no legacy technical debt remains.

## 2. Goals
- **Architectural Purity:** Eliminate all legacy AI code and establish a clean, modern foundation using best-in-class libraries (Vercel AI SDK).
- **Actionable Intelligence:** The agent must not just "chat" but "do". It must validly execute tools like `createTransaction`, `getBudgetStatus`, `analyzeSpending`.
- **Deep Context:** The agent must have access to the user's full financial history (database) to provide accurate answers.
- **Seamless UX:** Provide a dedicated, immersive chat experience that feels like a natural extension of the financial platform.

## 3. User Stories
- **US-1:** As a user, I want to say "I spent $50 on groceries at Walmart" and have the transaction created automatically with the correct category.
- **US-2:** As a user, I want to ask "How much did I spend on dining out last month?" and get an accurate total derived from my database.
- **US-3:** As a user, I want to receive proactive alerts like "You've exceeded your dining budget for this month" within the chat interface.
- **US-4:** As a user, I want a dedicated full-screen chat interface where I can have a continuous conversation about my finances.

## 4. Functional Requirements

### 4.1. "Clean Slate" Protocol
- **Delete Legacy:** Remove `app/api/ai`, `lib/ai` (except generic utils if strictly necessary), and `components/ai`.
- **New Structure:** Establish a new directory structure optimized for the Vercel AI SDK (Server Actions + React Server Components).

### 4.2. Core Agent Engine
- **Framework:** **Vercel AI SDK (Core + React)**. This is the current "gold standard" for Next.js applications, offering `streamUI`, `generateText` with tools, and RSC integration.
- **Model:** OpenAI GPT-4o (or equivalent high-intelligence model) for complex reasoning and tool calling.
- **Memory & Caching (Redis):**
    - Use Redis (e.g., Upstash) for:
        - **Rate Limiting:** Strict token bucket algorithm per user.
        - **Chat History:** Caching recent conversation turns for fast retrieval.
- **Semantic Search (Embeddings):**
    - **Vector Store:** Supabase `pgvector`.
    - **Embedding Model:** `text-embedding-3-small` (OpenAI).
    - **Functionality:** Embed transaction descriptions and notes to allow semantic queries like "Show me all coffee purchases" even if the category isn't "Coffee".
- **Tool Definitions:**
    - `create_transaction`: Zod schema validated.
    - `get_account_balance`: Query specific or all accounts.
    - `get_transactions_history`: SQL + Semantic Search hybrid.
    - `get_budget_analysis`: Compare spending vs goals.

### 4.3. Data Access (RAG & Tools)
- **Direct Database Access:** The agent will not rely purely on vector search (RAG) for simple queries but will use "Tools" to execute precise SQL queries (via Repositories) against Supabase.
- **Hybrid Search:** For queries like "expenses at Starbucks", try SQL `ilike` first, then fall back to Vector Search if results are sparse.
- **Context Injection:** System prompt must be dynamically injected with:
    - Current date/time.
    - User's currency settings.
    - List of valid Categories (IDs and Names) to ensure correct classification.
    - List of active Accounts (IDs and Names).

### 4.4. User Interface (Dedicated Page)
- **Route:** `/chat` (Protected Route).
- **Components:**
    - `ChatInterface`: Main container.
    - `MessageList`: Renders User/Assistant messages.
    - `ToolInvocation`: Visual representation of actions (e.g., a "Transaction Created" card, not just text).
    - `SuggestionChips`: Quick actions like "Analyze my spending".

## 5. Non-Goals
- **Voice Mode:** Voice-to-text is out of scope for MVP.
- **Image Analysis:** Receipt scanning is out of scope for this specific agent task (handled elsewhere).

## 6. Technical Considerations
- **Security:** Ensure RLS (Row Level Security) is respected. The Agent must run in the context of the authenticated user.
- **Rate Limiting:** Re-implement strict rate limiting (Redis or Database backed) to prevent token abuse.
- **Type Safety:** All tools must be strongly typed with Zod.

## 7. Success Metrics
- **Tool Success Rate:** > 95% of "Create Transaction" requests result in a valid DB entry without error.
- **Latency:** Initial response < 1.5s.
- **User Retention:** Users who try the chat return to it within 7 days.

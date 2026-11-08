# AI finance agent architecture

How the chat agent turns a sentence into a transaction, and why it is built this way.

## Shape

```
user message
  -> /api/chat (app/api/chat/route.ts)
       loads: accounts, categories (defaults + own), last 1000 transactions, base currency
       builds: system prompt (lib/ai/config.ts) with categories by id and the user's
               "description -> category" conventions (lib/ai/voice-capture/history-hints.ts)
  -> one tool-calling agent (AI SDK streamText, max 5 steps)
       tools (lib/ai/tools/build-chat-tools.ts):
         createTransaction, createTransfer, reclassifyExpenseAsTransfer,
         queryTransactions, searchTransactions, getAccountBalance, createGoal
  -> resolvers (lib/ai/tools/resolvers.ts)
       shared entity resolution (lib/ai/resolution/entity-resolver.ts)
       writes through repositories and atomic RPCs, behind HITL approval
```

## Decisions

| Question | Decision | Evidence |
| --- | --- | --- |
| Tools or a graph framework? | One tool-calling agent. The flows are single-step writes or reads; a graph adds orchestration the domain does not need. | Every failure found came from tool contracts (no transfer tool, wrong category filter), not from orchestration. |
| How is a category chosen? | The model picks an id from the injected list. The resolver accepts that id only within the movement's kind, then the model's category name. With no usable signal it asks. | Agent v2 eval: keyword scoring over the description alone was wrong 92/286 times (~60% precision). Live model ids: 87.5-100%. |
| Embeddings or RAG for categories? | The user's past conventions go into the prompt. Embeddings stay for transaction search (`hybrid_search_transactions`). | Voice capture eval (evals/voice-capture/REPORT.md): history in the prompt 98.9% vs embedding kNN 97.4% and lexical 96.7%; conventions 6/6 vs 3/6. |
| What if resolution is unsure? | `needs_clarification` with options; nothing is written. | Silent fallbacks caused the "everything goes to Carros" bug (#113). |
| Transfers | Own-account moves use `createTransfer` (atomic `create_transfer`). Mis-recorded expenses are repaired with `convert_expense_to_transfer` in one DB transaction. | #114. |

## Measuring changes

- `npm run eval:agent`: deterministic, CI-safe. Dataset integrity and the fallback resolver's safety (`wrong` must stay 0).
- `npm run eval:agent:live -- --intent=create_transfer --limit=25`: the real model with recording tools (no writes). Needs AI provider keys. Cases skipped for provider quota are reported as unmeasured, not as failures.

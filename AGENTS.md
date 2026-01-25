# Agent Skills Reference

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
| -------------------------------------------------------------- | --------------- |
| After creating/modifying a skill | `skill-sync` |
| Creating new skills | `skill-creator` |
| Regenerate AGENTS.md Auto-invoke tables (sync.sh) | `skill-sync` |
| styling components or fixing mobile UI | `mobile-ux-design` |
| Troubleshoot why a skill is missing from AGENTS.md auto-invoke | `skill-sync` |
| Using Supabase, authentication, database queries, RLS, storage, or realtime | `supabase-integration` |
| Working with AI, LLM calls, agents, tool execution, or chat features | `priority1-ai` |
| Working with money, transactions, accounts, budgets, or financial data | `money-handling` |
| Working with Next.js, App Router, Server Components, or frontend optimization | `nextjs-patterns` |
| Writing tests, testing components, or ensuring test coverage | `testing-strategy` |
<!-- gentle-ai:mandatory-tooling -->

# MANDATORY CORE TOOLING RULE: RTK, CONTEXT-MODE & CODEGRAPH

You and ALL subagents/delegated agents MUST strictly prioritize and exclusively use the following three tools for their designated domains:

1. **RTK (Rust Token Killer) — Exclusive Shell Execution**:
   - ALL terminal and bash commands MUST be run with `rtk` (e.g., `rtk <cmd>` or `rtk proxy <cmd>`).
   - Never execute raw commands that generate unbounded output when an RTK equivalent exists (`rtk git`, `rtk cargo`, `rtk npm`, `rtk ls`, `rtk grep`, etc.).
   - Cuts up to 90% of bash token usage.

2. **Context-Mode (ctx mode) — Exclusive File Reading & Data Processing**:
   - For all file reading, content analysis, searching, parsing, comparing, counting, and data transformation, use `context-mode` MCP tools (`ctx_execute_file`, `ctx_execute`, `ctx_batch_execute`, `ctx_search`, `ctx_index`, `ctx_fetch_and_index`):
     - `ctx_execute_file`: Primary tool for file inspection and analysis. Executes sandboxed JS/Python over `FILE_CONTENT` and prints only the derived result. NEVER dump entire files into the conversation.
     - `ctx_execute`: Run sandboxed code to compute answers directly instead of inspecting raw command dumps.
     - `ctx_batch_execute`: Batch multi-command repository reconnaissance into a single call.
     - `ctx_search` & `ctx_index`: Index and search codebase knowledge, notes, or session state.
     - `ctx_fetch_and_index`: Fetch web content and query it cleanly without dumping raw HTML.
   - Native `view_file` / `Read` is strictly reserved for small, exact byte ranges immediately preceding an edit.

3. **CodeGraph — Exclusive Codebase Navigation & Architecture Intelligence**:
   - For understanding architecture, tracing dependencies, call hierarchies, dynamic dispatch, symbol definitions, and blast-radius analysis:
     - ALWAYS call `codegraph_explore` (or the read-only upstream `codegraph` CLI if MCP is absent) BEFORE any manual filesystem searches, `grep`, or file reading.
     - One `codegraph_explore` query returns the verbatim line-numbered source AND its callers, callees, and dependencies in a single round-trip.
     - NEVER perform manual grep/find loops to map out code flow when CodeGraph is available.
     - If `.codegraph/` is missing in a project workspace, immediately initialize it with `gentle-ai codegraph init --cwd <project-root>`.

**SUBAGENT ENFORCEMENT**: Every subagent, delegated worker, or child process spawned MUST be instructed to adhere strictly to these three tools. No exceptions.

<!-- /gentle-ai:mandatory-tooling -->

# Agent Skills Reference

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                                                                        | Skill                              |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| After creating/modifying a skill                                              | `skill-sync`                       |
| Configuring connection pooling or scaling                                     | `supabase-postgres-best-practices` |
| Creating new skills                                                           | `skill-creator`                    |
| Creating testable and mockable codebases                                      | `architecture-patterns`            |
| Designing distinctive frontend interfaces or styling UI for a bold aesthetic  | `frontend-aesthetics`              |
| Designing new backend systems from scratch                                    | `architecture-patterns`            |
| Establishing architecture standards for your team                             | `architecture-patterns`            |
| Implementing data fetching (client or server-side)                            | `vercel-react-best-practices`      |
| Implementing domain-driven design principles                                  | `architecture-patterns`            |
| Implementing indexes or query optimization                                    | `supabase-postgres-best-practices` |
| Migrating from tightly coupled to loosely coupled architectures               | `architecture-patterns`            |
| Optimizing bundle size or load times                                          | `vercel-react-best-practices`      |
| Optimizing for Postgres-specific features                                     | `supabase-postgres-best-practices` |
| Planning microservices decomposition                                          | `architecture-patterns`            |
| Refactoring existing React/Next.js code                                       | `vercel-react-best-practices`      |
| Refactoring monolithic applications for better maintainability                | `architecture-patterns`            |
| Regenerate AGENTS.md Auto-invoke tables (sync.sh)                             | `skill-sync`                       |
| Review files for compliance with Web Interface Guidelines                     | `web-interface-guidelines`         |
| Reviewing code for performance issues                                         | `vercel-react-best-practices`      |
| Reviewing database performance issues                                         | `supabase-postgres-best-practices` |
| styling components or fixing mobile UI                                        | `mobile-ux-design`                 |
| Troubleshoot why a skill is missing from AGENTS.md auto-invoke                | `skill-sync`                       |
| Using Supabase, authentication, database queries, RLS, storage, or realtime   | `supabase-integration`             |
| Working with AI, LLM calls, agents, tool execution, or chat features          | `priority1-ai`                     |
| Working with money, transactions, accounts, budgets, or financial data        | `money-handling`                   |
| Working with Next.js, App Router, Server Components, or frontend optimization | `nextjs-patterns`                  |
| Working with Row-Level Security (RLS)                                         | `supabase-postgres-best-practices` |
| Writing new React components or Next.js pages                                 | `vercel-react-best-practices`      |
| Writing SQL queries or designing schemas                                      | `supabase-postgres-best-practices` |
| Writing tests, testing components, or ensuring test coverage                  | `testing-strategy`                 |
| Performing git commits, pushes, or managing git hooks                         | `no-verify-guard`                  |

## FinTec Project Skills

| Action                                                                         | Skill                      |
| ------------------------------------------------------------------------------ | -------------------------- |
| Creating new UI components, pages, modals, forms, or styling any interface     | `frontend-aesthetics`      |
| Styling components with Tailwind, working with breakpoints, shadows, or tokens | `mobile-ux-design`         |
| Creating routes, pages, API routes, or implementing data patterns in Next.js   | `nextjs-patterns`          |
| Implementing complex TypeScript types, generics, or type-safe components       | `architecture-patterns`    |
| Auditing accessibility, keyboard navigation, ARIA, or screen reader support    | `web-interface-guidelines` |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                                                                        | Skill                              |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| After creating/modifying a skill                                              | `skill-sync`                       |
| Configuring connection pooling or scaling                                     | `supabase-postgres-best-practices` |
| Creating new skills                                                           | `skill-creator`                    |
| Creating testable and mockable codebases                                      | `architecture-patterns`            |
| Designing distinctive frontend interfaces or styling UI for a bold aesthetic  | `frontend-aesthetics`              |
| Designing new backend systems from scratch                                    | `architecture-patterns`            |
| Establishing architecture standards for your team                             | `architecture-patterns`            |
| Implementing data fetching (client or server-side)                            | `vercel-react-best-practices`      |
| Implementing domain-driven design principles                                  | `architecture-patterns`            |
| Implementing indexes or query optimization                                    | `supabase-postgres-best-practices` |
| Migrating from tightly coupled to loosely coupled architectures               | `architecture-patterns`            |
| Optimizing bundle size or load times                                          | `vercel-react-best-practices`      |
| Optimizing for Postgres-specific features                                     | `supabase-postgres-best-practices` |
| Planning microservices decomposition                                          | `architecture-patterns`            |
| Refactoring existing React/Next.js code                                       | `vercel-react-best-practices`      |
| Refactoring monolithic applications for better maintainability                | `architecture-patterns`            |
| Regenerate AGENTS.md Auto-invoke tables (sync.sh)                             | `skill-sync`                       |
| Review files for compliance with Web Interface Guidelines                     | `web-interface-guidelines`         |
| Reviewing code for performance issues                                         | `vercel-react-best-practices`      |
| Reviewing database performance issues                                         | `supabase-postgres-best-practices` |
| Searching for or installing new agent skills                                  | `find-skills`                      |
| Troubleshoot why a skill is missing from AGENTS.md auto-invoke                | `skill-sync`                       |
| Using Supabase, authentication, database queries, RLS, storage, or realtime   | `supabase-integration`             |
| Working with AI, LLM calls, agents, tool execution, or chat features          | `priority1-ai`                     |
| Working with Next.js, App Router, Server Components, or frontend optimization | `nextjs-patterns`                  |
| Working with Row-Level Security (RLS)                                         | `supabase-postgres-best-practices` |
| Working with money, transactions, accounts, budgets, or financial data        | `money-handling`                   |
| Writing SQL queries or designing schemas                                      | `supabase-postgres-best-practices` |
| Writing new React components or Next.js pages                                 | `vercel-react-best-practices`      |
| Writing tests, testing components, or ensuring test coverage                  | `testing-strategy`                 |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

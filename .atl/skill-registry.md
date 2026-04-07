# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

**Last refreshed**: 2026-04-06 (sdd-init, engram mode)

## User Skills

| Trigger                                                                                                                                                                                                                                       | Skill                            | Path                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Designing backend architectures or applying DDD and Clean Architecture patterns.                                                                                                                                                              | architecture-patterns            | C:\Users\ismar\Documents\projects\fintec\.claude\skills\architecture-patterns\SKILL.md            |
| PR creation workflow for Agent Teams Lite following the issue-first enforcement system.                                                                                                                                                       | branch-pr                        | C:\Users\ismar\.config\opencode\skills\branch-pr\SKILL.md                                         |
| Guides creation of distinctive, production-grade frontend interfaces that avoid generic aesthetics.                                                                                                                                           | frontend-aesthetics              | C:\Users\ismar\Documents\projects\fintec\.claude\skills\frontend-aesthetics\SKILL.md              |
| Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing.                                                                                                                                                                      | go-testing                       | C:\Users\ismar\.config\opencode\skills\go-testing\SKILL.md                                        |
| Issue creation workflow for Agent Teams Lite following the issue-first enforcement system.                                                                                                                                                    | issue-creation                   | C:\Users\ismar\.config\opencode\skills\issue-creation\SKILL.md                                    |
| Parallel adversarial review protocol that launches two independent blind judge sub-agents simultaneously to review the same target, synthesizes their findings, applies fixes, and re-judges until both pass or escalates after 2 iterations. | judgment-day                     | C:\Users\ismar\.config\opencode\skills\judgment-day\SKILL.md                                      |
| Guidance for UI/UX implementation, mobile responsiveness, and design system usage (Tailwind + Capacitor).                                                                                                                                     | mobile-ux-design                 | C:\Users\ismar\Documents\projects\fintec\.claude\skills\mobile-ux-design\SKILL.md                 |
| Critical patterns for handling money in FinTec with precision and correctness.                                                                                                                                                                | money-handling                   | C:\Users\ismar\Documents\projects\fintec\.claude\skills\money-handling\SKILL.md                   |
| Next.js 14 App Router patterns, Server/Client Components, and performance optimization.                                                                                                                                                       | nextjs-patterns                  | C:\Users\ismar\Documents\projects\fintec\.claude\skills\nextjs-patterns\SKILL.md                  |
| Priority 1 AI Infrastructure: Recovery, Verification, HITL, and Durable Execution.                                                                                                                                                            | priority1-ai                     | C:\Users\ismar\Documents\projects\fintec\.claude\skills\priority1-ai\SKILL.md                     |
| Creates new AI agent skills following the Agent Skills spec.                                                                                                                                                                                  | skill-creator                    | C:\Users\ismar\Documents\projects\fintec\.agent\skills\skill-creator\SKILL.md                     |
| Regenerate AGENTS.md auto-invoke tables and keep skill references synchronized.                                                                                                                                                               | skill-sync                       | C:\Users\ismar\Documents\projects\fintec\.agent\skills\skill-sync\SKILL.md                        |
| Patterns for integrating Supabase in FinTec (Auth, Database, Storage, Realtime).                                                                                                                                                              | supabase-integration             | C:\Users\ismar\Documents\projects\fintec\.claude\skills\supabase-integration\SKILL.md             |
| Supabase Postgres best practices for performance optimization, query tuning, and schema design.                                                                                                                                               | supabase-postgres-best-practices | C:\Users\ismar\Documents\projects\fintec\.claude\skills\supabase-postgres-best-practices\SKILL.md |
| Comprehensive testing strategy for FinTec: unit, integration, E2E, and mutation testing.                                                                                                                                                      | testing-strategy                 | C:\Users\ismar\Documents\projects\fintec\.claude\skills\testing-strategy\SKILL.md                 |
| Vercel React Best Practices for performance optimization in React and Next.js.                                                                                                                                                                | vercel-react-best-practices      | C:\Users\ismar\Documents\projects\fintec\.claude\skills\vercel-react-best-practices\SKILL.md      |
| Reviews files for compliance with Web Interface Guidelines.                                                                                                                                                                                   | web-interface-guidelines         | C:\Users\ismar\Documents\projects\fintec\.claude\skills\web-interface-guidelines\SKILL.md         |

## Compact Rules

### architecture-patterns

- Keep domain rules framework-agnostic and independent from infrastructure.
- Organize by domain/module first, then by layers: domain, application, infrastructure, boundary/BFF.
- Dependencies flow inward only; adapters implement ports owned by application.
- Prefer repository/port abstractions for persistence and external services.
- Separate commands/use cases from delivery details to keep code testable and mockable.
- Document structural changes with ADRs and make trade-offs explicit.

### branch-pr

- Inspect git status, branch tracking, diff against base, and commit history before opening a PR.
- Summarize the full branch delta, not just the latest commit.
- Push the branch with upstream if needed before `gh pr create`.
- Use a clear PR title and a body with concise summary bullets.
- Return the PR URL after creation.

### frontend-aesthetics

- Start with a strong visual concept; avoid generic Tailwind defaults.
- Build a constrained palette, typography, spacing, and motion language per surface.
- Use contrast, hierarchy, and rhythm intentionally to make the interface memorable.
- Prefer reusable primitives over one-off decorative hacks.
- Motion must clarify state changes, not distract from them.
- Polish loading, empty, hover, and error states to production quality.

### go-testing

- Prefer table-driven tests for behavior coverage and easier edge-case expansion.
- Test public behavior and contracts, not internal implementation details.
- For Bubbletea, use teatest-style interaction assertions instead of brittle timing hacks.
- Isolate side effects with temp dirs, fake clocks, and injected dependencies.
- Keep tests deterministic and fast enough for repeated local runs.

### issue-creation

- Gather the problem statement, reproduction, expected behavior, and scope before creating the issue.
- Use `gh` for GitHub issue workflows.
- Write acceptance criteria that are testable and implementation-neutral.
- Avoid vague titles; make the issue searchable by symptom or goal.
- Link relevant files, PRs, or docs when they change the context.

### judgment-day

- Run two independent reviews against the same target before trusting the result.
- Synthesize overlapping findings first; fix root causes, not reviewer wording.
- Re-run the review after fixes and stop after two failed iterations to escalate.
- Keep the final report grounded in repository evidence, not opinion.
- Treat disagreements as signals to verify assumptions with code/tests.

### mobile-ux-design

- Design mobile-first and validate every screen at narrow widths before desktop polish.
- Respect safe areas, keyboard overlap, touch target size, and thumb reach.
- Use Tailwind + Capacitor patterns that feel native on iOS and Android.
- Prefer smooth, lightweight motion and avoid layout jank on low-end devices.
- Keep forms, navigation, and bottom actions reachable and obvious.
- Test responsive states, not just static breakpoints.

### money-handling

- Never use floating point for monetary calculations; use exact representations.
- Carry currency metadata with every amount and validate cross-currency operations explicitly.
- Round only at well-defined boundaries and document the rounding rule.
- Preserve sign, balance, and reconciliation invariants in domain logic.
- Make financial transformations auditable and reproducible.
- Treat exchange-rate and period-boundary logic as high-risk code paths.

### nextjs-patterns

- Default to Server Components; add `use client` only when browser-only interactivity is required.
- Keep data access on the server/BFF boundary and avoid leaking backend concerns into UI components.
- Use route handlers or server actions deliberately, with explicit cache and revalidation behavior.
- Co-locate `loading`, `error`, and suspense boundaries with route segments.
- Minimize client bundles by pushing computation and fetching to the server when possible.
- Follow App Router conventions over legacy Pages Router patterns.

### priority1-ai

- Make AI workflows durable: retries, resumability, and idempotency matter more than happy paths.
- Use structured inputs/outputs for prompts and tool calls.
- Add HITL checkpoints for destructive, costly, or ambiguous actions.
- Log decisions, tool results, and failures so runs can be audited and recovered.
- Validate external model output before it mutates state or triggers side effects.
- Prefer bounded, explicit tool orchestration over open-ended agent loops.

### skill-creator

- Write skills with a clear trigger, purpose, workflow, and non-negotiable rules.
- Optimize for actionable guidance, not long explanations.
- Include only the patterns a sub-agent must apply to avoid bugs.
- Keep examples short and representative.
- After adding or editing a skill, refresh the registry/sync artifacts.

### skill-sync

- Regenerate AGENTS auto-invoke tables after skill changes.
- Verify new skills appear in the right auto-load contexts.
- Keep project and user skill references synchronized to avoid stale docs.
- Treat missing or duplicated skill entries as registry drift to fix immediately.
- Re-run sync after renames, removals, or trigger changes.

### supabase-integration

- Separate server and client Supabase access; never leak privileged credentials to the browser.
- Prefer `@supabase/ssr` patterns for auth/session handling in Next.js.
- Design with RLS enabled first, then fit queries and policies to that model.
- Keep database access behind repositories/BFF handlers instead of direct UI calls.
- Treat Storage, Realtime, and Edge usage as infrastructure concerns with explicit boundaries.
- Validate auth and policy assumptions with tests, not hope.

### supabase-postgres-best-practices

- Use migrations for DDL and keep schema changes reviewable.
- Enable and verify RLS on business tables.
- Add indexes for real filter/sort paths; avoid cargo-cult indexing.
- Prefer explicit column lists and shaped queries over broad `SELECT *` reads.
- Model constraints and foreign keys in Postgres, not only in application code.
- Investigate hot paths with execution evidence before optimizing.

### testing-strategy

- Balance the pyramid: fast unit tests, targeted integration tests, critical E2E journeys, and mutation checks where valuable.
- Test contracts and user-visible behavior before implementation details.
- Keep fixtures deterministic and isolated per test.
- Add regression coverage for every important bug fix.
- Prefer the smallest test that proves the behavior.
- Make pre-commit and CI checks realistic enough to catch architectural regressions.

### vercel-react-best-practices

- Fetch on the server when possible to reduce client JavaScript and waterfalls.
- Avoid unnecessary effects and memoization; derive state directly when feasible.
- Split interactive islands so most UI stays static or server-rendered.
- Use streaming, suspense, and progressive loading intentionally.
- Watch bundle size, re-render cost, and network duplication on every feature.
- Optimize images, fonts, and third-party code as first-class performance work.

### web-interface-guidelines

- Use semantic structure and preserve keyboard-first accessibility.
- Maintain visible focus states, contrast, and clear feedback for errors/loading.
- Build responsive layouts that work across viewport and input types.
- Prefer predictable controls and clear information hierarchy over novelty.
- Validate empty, error, and success states explicitly.
- Fix guideline violations at the source component, not with page-level hacks.

## Project Conventions

| File      | Path                                               | Notes                                                               |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| AGENTS.md | C:\Users\ismar\Documents\projects\fintec\AGENTS.md | Index — auto-invoke skill rules and project-wide agent instructions |
| GEMINI.md | C:\Users\ismar\Documents\projects\fintec\GEMINI.md | Project-level Gemini convention file (currently empty)              |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.

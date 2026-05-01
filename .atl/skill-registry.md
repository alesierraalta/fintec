# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| git commit, git push | no-verify-guard | .agents/skills/no-verify-guard/SKILL.md |
| supabase, rls, auth | supabase-integration | .claude/skills/supabase-integration/SKILL.md |
| nextjs, app router | nextjs-patterns | .claude/skills/nextjs-patterns/SKILL.md |
| test, coverage, jest | testing-strategy | .claude/skills/testing-strategy/SKILL.md |
| architecture, ddd | architecture-patterns | .claude/skills/architecture-patterns/SKILL.md |

## Compact Rules

### no-verify-guard
- **NEVER use --no-verify or -n flags** in git commands.
- If pre-commit/pre-push hooks fail, fix the underlying issues (tests, lint, etc.).
- Bypassing checks is strictly prohibited.
- If env vars are missing, mock them or update configuration.

### supabase-integration
- Use the repository pattern for all database access.
- Ensure Row-Level Security (RLS) is enabled for all tables.
- Use `supabase-js` for client-side and `supabase/admin` for server-side auth/ops.

### nextjs-patterns
- Prefer Server Components for data fetching.
- Use the App Router convention (layout.tsx, page.tsx).
- Implement Server Actions for mutations.

### testing-strategy
- 80% Jest coverage required for new features.
- Use Playwright for E2E flows (lanes pattern).
- Follow the Red-Green-Refactor cycle in TDD.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | AGENTS.md | Index - core project skills and auto-invoke table |
| .atl/skill-registry.md | .atl/skill-registry.md | This registry |

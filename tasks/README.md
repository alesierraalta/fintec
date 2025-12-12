# Tasks Workspace

This folder is the single source of truth for planning and execution checklists.

## Structure

- `tasks/prd/`: PRDs grouped by context.
  - Each PRD lives in its own folder:
    - `prd.md`: the PRD (scope, goals, UX rules, success metrics).
    - `tasksprd/tasks.md`: the single, extremely detailed task plan for that PRD (includes all checklists).

## Rules (mandatory)

- Use MCP-first workflow (Serena for local code intelligence; Context7/Docfork for best practices).
- Keep tasks atomic, testable, and reversible.
- Prefer refactors that reduce complexity and re-use existing UI primitives.
- Improve UX on both desktop and mobile without changing FinTec’s visual identity (black theme + iOS-like interactions).

## MCP tool roster (use intentionally)

- **Serena MCP**: local repo intelligence + safe edits (`list_dir`, `find_file`, `search_for_pattern`, `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `read_file`, `replace_regex`, `apply_patch`, `write_memory`, `think_about_*`).
- **Context7**: authoritative library docs for API/best practices (Next.js, React, Tailwind).
- **Docfork**: “browser” doc search/read for web best practices and patterns.
- **Magic UI**: optional UI micro-interactions/components (only if it preserves FinTec’s essence).
- **n8n MCP / PostgreSQL MCP**: only if a PRD requires automation or DB-level UX features.

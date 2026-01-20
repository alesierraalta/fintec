---
name: skill-sync
 description: >
  Syncs skill metadata to AGENTS.md Auto-invoke sections.
  Trigger: When updating skill metadata (metadata.scope/metadata.auto_invoke), regenerating Auto-invoke tables, or running ./.agent/skills/skill-sync/assets/sync.sh (including --dry-run/--scope).
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke:
    - 'After creating/modifying a skill'
    - 'Regenerate AGENTS.md Auto-invoke tables (sync.sh)'
    - 'Troubleshoot why a skill is missing from AGENTS.md auto-invoke'
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

## Purpose

Keeps AGENTS.md Auto-invoke sections in sync with skill metadata. When you create or modify a skill, run the sync script to automatically update all affected AGENTS.md files.

## Required Skill Metadata

Each skill that should appear in Auto-invoke sections needs these fields in `metadata`.

`auto_invoke` can be either a single string **or** a list of actions:

```yaml
metadata:
  version: '1.0'
  scope: [ui] # Which AGENTS.md: ui, api, sdk, root

  # Option A: single action
  auto_invoke: 'Creating/modifying components'

  # Option B: multiple actions
  # auto_invoke:
  #   - "Creating/modifying components"
  #   - "Refactoring component folder placement"
```

### Scope Values

| Scope    | Updates            | Description                           |
| -------- | ------------------ | ------------------------------------- |
| `root`   | `AGENTS.md` (root) | Global repository standards           |
| `api`    | `AGENTS.md` (root) | NestJS modules, services, controllers |
| `common` | `AGENTS.md` (root) | Shared utils, decorators, middleware  |
| `infra`  | `AGENTS.md` (root) | Database, migrations, containers      |

Skills can have multiple scopes: `scope: [api, common]`. All scopes currently update the central `AGENTS.md`.

---

## Usage

### After Creating/Modifying a Skill

```bash
./.agent/skills/skill-sync/assets/sync.sh
```

### What It Does

1. Reads all `.agent/skills/*/SKILL.md` files
2. Extracts `metadata.scope` and `metadata.auto_invoke`
3. Generates Auto-invoke tables for each AGENTS.md
4. Updates the `### Auto-invoke Skills` section in each file

---

## Example

Given this skill metadata:

```yaml
# .agent/skills/myapp-ui/SKILL.md
metadata:
  version: '1.0'
  scope: [ui]
  auto_invoke: 'Creating/modifying React components'
```

The sync script generates in `ui/AGENTS.md`:

```markdown
### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                              | Skill      |
| ----------------------------------- | ---------- |
| Creating/modifying React components | `myapp-ui` |
```

---

## Commands

```bash
# Sync all AGENTS.md files
./.agent/skills/skill-sync/assets/sync.sh

# Dry run (show what would change)
./.agent/skills/skill-sync/assets/sync.sh --dry-run

# Sync specific scope only
./.agent/skills/skill-sync/assets/sync.sh --scope ui
```

---

## Checklist After Modifying Skills

- [ ] Added `metadata.scope` to new/modified skill
- [ ] Added `metadata.auto_invoke` with action description
- [ ] Ran `./.agent/skills/skill-sync/assets/sync.sh`
- [ ] Verified AGENTS.md files updated correctly

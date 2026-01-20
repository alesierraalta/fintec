---
name: skill-creator
description: >
  Creates new AI agent skills following the Agent Skills spec.
  Trigger: When user asks to create a new skill, add agent instructions, or document patterns for AI.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Creating new skills'
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, WebSearch, Task
---

## When to Create a Skill

Create a skill when:

- A pattern is used repeatedly and AI needs guidance
- Project-specific conventions differ from generic best practices
- Complex workflows need step-by-step instructions
- Decision trees help AI choose the right approach

**Don't create a skill when:**

- Documentation already exists (create a reference instead)
- Pattern is trivial or self-explanatory
- It's a one-off task

---

## Skill Structure

```
.agent/skills/{skill-name}/
├── SKILL.md              # Required - main skill file
├── assets/               # Optional - templates, schemas, examples
│   ├── template.py
│   └── schema.json
└── references/           # Optional - links to local docs
    └── docs.md           # Points to documentation/*.md
```

---

## SKILL.md Template

````markdown
---
name: { skill-name }
description: >
  {One-line description of what this skill does}.
  Trigger: {When the AI should load this skill}.
metadata:
  version: '1.0'
  scope: [api] # Options: root, api, common, infra
  auto_invoke: '{Action that requires this skill}'
---

## When to Use

{Bullet points of when to use this skill}

## Critical Patterns

{The most important rules - what AI MUST know}

## Code Examples

{Minimal, focused examples}

## Commands

```bash
{Common commands}
```
````

## Resources

- **Templates**: See [assets/](assets/) for {description}
- **Documentation**: See [references/](references/) for local docs

```

---

## Naming Conventions

| Type | Pattern | Examples |
|------|---------|----------|
| Generic skill | `{technology}` | `nest`, `typeorm`, `jest` |
| Project-specific | `{project}-{component}` | `myapp-api`, `myapp-auth`, `myapp-encryption` |
| Testing skill | `{project}-test-{component}` | `myapp-test-e2e`, `myapp-test-security` |
| Workflow skill | `{action}-{target}` | `skill-creator`, `db-migrate` |

---

## Decision: assets/ vs references/

```

Need code templates? → assets/
Need JSON schemas? → assets/
Need example configs? → assets/
Link to existing docs? → references/
Link to external guides? → references/ (with local path)

```

**Key Rule**: `references/` should point to LOCAL files (`documentation/*.md`), not web URLs.

---

## Decision: Project-Specific vs Generic

```

Patterns apply to ANY project? → Generic skill (e.g., nest, typeorm)
Patterns are Project-specific? → {project}-{name} skill
Generic skill needs Project info? → Add references/ pointing to documentation

````

---

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (lowercase, hyphens) |
| `description` | Yes | What + Trigger in one block |
| `license` | No | Optional (omit if not needed) |
| `metadata.author` | No | Optional author identifier |
| `metadata.version` | Yes | Semantic version as string |

---

## Content Guidelines

### DO
- Start with the most critical patterns
- Use tables for decision trees
- Keep code examples minimal and focused
- Include Commands section with copy-paste commands

### DON'T
- Add Keywords section (agent searches frontmatter, not body)
- Duplicate content from existing docs (reference instead)
- Include lengthy explanations (link to docs)
- Add troubleshooting sections (keep focused)
- Use web URLs in references (use local paths)

---

## Registering the Skill

After creating the skill, add it to `AGENTS.md`:

```markdown
| `{skill-name}` | {Description} | [SKILL.md](.agent/skills/{skill-name}/SKILL.md) |
````

---

## Checklist Before Creating

- [ ] Skill doesn't already exist (check `.agent/skills/`)
- [ ] Pattern is reusable (not one-off)
- [ ] Name follows conventions
- [ ] Frontmatter is complete (description includes trigger keywords)
- [ ] Critical patterns are clear
- [ ] Code examples are minimal
- [ ] Commands section exists
- [ ] Added to AGENTS.md

## Resources

- **Templates**: See [assets/](assets/) for SKILL.md template

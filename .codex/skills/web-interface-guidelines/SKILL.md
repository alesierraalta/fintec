---
name: web-interface-guidelines
description: >
  Reviews files for compliance with Web Interface Guidelines.
  Trigger: Review files for compliance with Web Interface Guidelines.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Review files for compliance with Web Interface Guidelines'
allowed-tools: Read, Grep, Glob, WebFetch
---

## When to Use

Use this skill when:

- Reviewing files for compliance with Web Interface Guidelines
- Applying the latest UI guideline rules to specific files or patterns
- Auditing web interface code for guideline violations

---

## How It Works

1. Fetch the latest guidelines from the source URL using WebFetch.
2. If the user did not provide files or a pattern, ask for them.
3. Read only the specified files (use Glob for patterns).
4. Check all rules from the fetched guidelines.
5. Output findings using the exact format specified by the guidelines.

---

## Guidelines Source

Fetch fresh guidelines before each review:

- https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

---

## Output Requirements

- Follow the output format specified in the fetched guidelines.
- Use terse `file:line` entries when required.
- One finding per line unless the guidelines specify otherwise.
- If no findings, follow the guidelines for empty output.

---

## Code Examples

```text
app/page.tsx:42
```

---

## Commands

```bash
# No CLI commands required for this review workflow.
```

---

## Resources

- **Guidelines**: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`

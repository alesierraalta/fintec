---
name: frontend-aesthetics
description: >
  Guides creation of distinctive, production-grade frontend interfaces that avoid generic aesthetics.
  Trigger: Designing or styling frontend components, pages, or apps with a clear aesthetic direction.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Designing distinctive frontend interfaces or styling UI for a bold aesthetic'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Building a new component, page, or application interface
- Reworking a generic layout into a distinctive aesthetic
- Defining a visual direction for a product or marketing surface
- Implementing high-fidelity UI with custom typography, color, and motion

---

## Critical Patterns

- Choose a bold aesthetic direction before coding and commit to it.
- Define purpose, tone, constraints, and differentiation.
- Avoid generic AI aesthetics and predictable layouts.
- Use expressive typography and cohesive, intentional color systems.
- Orchestrate motion with one strong page-load sequence and purposeful interactions.
- Match implementation complexity to the aesthetic vision.

---

## Design Thinking

- Purpose: What problem does the interface solve, and for whom?
- Tone: Pick a clear direction (e.g., brutalist, editorial, organic, industrial).
- Constraints: Framework, performance, accessibility, and platform limits.
- Differentiation: Identify the one unforgettable visual idea to anchor the design.

---

## Frontend Aesthetics Guidelines

- Typography: Use distinctive display fonts with a refined body pairing.
- Color and Theme: Commit to a dominant palette with sharp accents. Use CSS variables.
- Motion: Favor one orchestrated reveal with staggered timings over scattered micro-effects.
- Spatial Composition: Use asymmetry, overlap, diagonal flow, or controlled density.
- Backgrounds and Detail: Add depth with gradient meshes, noise, patterns, and layered light.
- Avoid: Inter, Roboto, Arial, system defaults; purple-on-white cliches; cookie-cutter layouts.

---

## Code Examples

```css
:root {
  --font-display: 'Fraunces', 'Times New Roman', serif;
  --font-body: 'Newsreader', 'Georgia', serif;
  --color-ink: #12110c;
  --color-paper: #f6f0e6;
  --color-accent: #c56c2a;
  --shadow-hero: 0 40px 120px rgba(18, 17, 12, 0.18);
}

h1,
h2 {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

body {
  font-family: var(--font-body);
  background: var(--color-paper);
  color: var(--color-ink);
}
```

---

## Commands

```bash
npm run dev
npm run lint
npm run build
```

---

## Resources

- **App**: `app/`
- **Components**: `components/`
- **Styles**: `app/globals.css`

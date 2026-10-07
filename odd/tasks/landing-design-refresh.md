# Feature: Landing Design Refresh (ciclo continuo de automejora)

## Objective

Elevar la calidad de diseño de la landing pública de FinTec (`app/(public)/components/*`) de "SaaS genérico" a una landing con lenguaje propio, ejecutando mejoras en ciclos sucesivos y verificadas.

## Design read

- Page kind: fintech SaaS landing (redesign — preserve).
- Audience: consumidores y pequeños negocios en Venezuela; trust-first.
- Vibe: Apple/iOS (la app es una app de finanzas con estética iOS), refined, no experimental.
- Stack: Tailwind tokens semánticos + CSS motion (RSC-safe, sin hooks de cliente donde no los hay).
- Dials: `DESIGN_VARIANCE: 7` · `MOTION_INTENSITY: 6` · `VISUAL_DENSITY: 4`.

## Why

- La landing actual acumula violaciones de las reglas duras de diseño (eyebrows repetidos, CTAs con labels duplicados por intención, radius sin sistema, motion ausente).
- El usuario pidió un ciclo largo de automejora constante: cada ciclo deja la página mejor y verificada.

## Scope

### In scope

- `app/(public)/components/*` (hero, rate-cockpit, evidence-strip, features, faq, pricing, cta, nav, footer, landing-page).
- `app/globals.css` solo si se necesitan utilidades de motion compartidas.
- Copy en español (es_VE) — el proyecto es español; NO traducir UI a inglés.

### Out of scope

- Lógica de negocio, datos, pricing real (`types/subscription.ts` es fuente de verdad).
- Cambiar la paleta de marca (iOS Blue) o la tipografía raíz (Inter) — decisión de marca, no de este ciclo.
- Páginas fuera de `(public)`.

## Constraints (hard)

1. `tests/node/landing-revamp.test.tsx` debe seguir pasando:
   - hero: sin `<Link...onClick>`, con `<TrackedLandingLink`, `/auth/register`, `#tasas-en-vivo`, palabras `Movimiento`/`Presupuesto`/`Decisión`, y SIN `Tasas de referencia`.
   - RateCockpit: conserva `Tasas de referencia`, `BCV`, `P2P`, `15 minutos`.
   - EvidenceStrip: sin `Tasas BCV` ni `Mercado P2P`.
   - FeaturesSection: sin `Tasas en Tiempo Real`.
2. Componentes server: nada de `onClick`/handlers en `Link`; usar `TrackedLandingLink`.
3. Tokens semánticos (`bg-primary`, `text-muted-foreground`, `border-border`), safe areas, targets ≥44px.
4. Motion: solo `transform`/`opacity`, siempre con `prefers-reduced-motion`.
5. Ambos temas (light/dark) deben verse bien.

## Checklist

### Ciclo 1 — Fundaciones y violaciones duras

- [x] T1.1 Reducir eyebrows a ≤3 (quedan: hero badge, FUNCIONALIDADES, EMPIEZA HOY; eliminados rate-cockpit y evidence-strip).
- [x] T1.2 Unificar label de registro a "Crear cuenta gratis" en nav/hero/cta/pricing-free; hrefs intactos.
- [x] T1.3 Hero `pt-24`, H1 sin gradiente de 3 paradas (sólido `text-foreground`), stack de 4 elementos.
- [x] T1.4 Sistema de radius aplicado y documentado en `landing-page.tsx` (superficies 2xl / interactivos xl / pills full).
- [x] T1.5 Ritmo unificado `py-20 sm:py-24` + hairline único; cockpit conserva `pb-16`.
- [x] T1.6 Motion: stagger del hero (0→400ms, fill backwards), `active:scale-[0.98]` en CTAs, `reveal.tsx` compartido (IntersectionObserver, SSR visible, reduced-motion saltado).
- [x] T1.7 Verificación (writer + spot check del padre): lint exit 0; landing-revamp 4/4; page.test 7/7; tsc no errors.

### Ciclo 1 — deuda detectada (para cerrar)

- [ ] T1.8 Actualizar selector E2E `tests/e2e/root-entry.spec.ts:28` (`/Registrarse/i` → `/Crear cuenta gratis/i`) por el rename intencional de T1.2.
- [ ] T1.9 Commit work-unit en rama feature (el árbol trae ~95 archivos sucios de otros features: NO se tocan).

### Ciclos siguientes (backlog)

- [ ] T2.x Auditoría de contraste AA en CTAs y botones.
- [ ] T2.x Diversidad de layout (evitar grid de tarjetas repetido).
- [ ] T3.x Copy self-audit (registro único, sin copy AI).
- [ ] T3.x Micro-interacciones hover/active en CTAs.
- [ ] T4.x Revisión visual real en navegador (light + dark).

## Progress

- [x] Exploración: 9 componentes + tokens + tailwind + layout mapeados.
- [x] Auditoría inicial con hallazgos duros.
- Ciclo 1 en curso.

## Verification evidence

- (pendiente tras T1.7)

## Route declaration

- Ruta: delegated direct (trigger: writer — 10+ archivos no triviales). No SDD.
- TDD: no aplica (cambio de presentación; la red de seguridad es `landing-revamp.test.tsx`).

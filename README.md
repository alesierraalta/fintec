# FinTec

Plataforma de gestion financiera construida sobre Next.js App Router.

## Estado actual del proyecto

- Framework principal: Next.js 16 (`next@16.0.10`) con React 19 y TypeScript.
- UI y estilos: Tailwind CSS 3 + componentes React.
- Datos y backend: Supabase (`@supabase/supabase-js`, `@supabase/ssr`) y persistencia local con Dexie.
- Arquitectura actual del repo: monolito modular en transicion a arquitectura por dominios.
- CI: pipeline base activa en `.github/workflows/ci.yml` para type-check, lint, test y build.

## Inicio rapido

### Prerrequisitos

- Node.js >= 18 (recomendado: 20 LTS para desarrollo local estable con Next 16).
- npm.

### Setup local

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

App local: `http://localhost:3000`

## Scripts reales

Los siguientes scripts estan definidos en `package.json`:

```bash
# App
npm run dev
npm run build
npm run start

# Mobile (Capacitor)
npm run build:mobile
npm run cap:ios
npm run cap:android

# Calidad
npm run lint
npm run lint:fix
npm run type-check
npm run precommit:staged
npm run prepush:verify
npm run format
npm run format:check
npm run spellcheck
npm run secretlint
npm run guard:db-access

# Testing
npm run test
npm run test:watch
npm run test:coverage
npm run e2e
npm run e2e:ui
npm run test:load
npm run test:mutate

# Limpieza
npm run clean
npm run clean:temp
npm run clean:docs
npm run clean:all
```

## Testing y CI

- Unit/integration: Jest configurado con proyectos `dom` y `node` (`jest.config.js`).
- E2E: Playwright (`playwright.config.ts`) con navegadores desktop y mobile.
- Modo E2E sin login (`npm run e2e:no-auth`): habilita `PLAYWRIGHT_NO_AUTH_SETUP=1` y `FRONTEND_AUTH_BYPASS=1` para probar rutas protegidas del frontend sin setup de sesion.
- Performance baseline: k6 (`k6/api-stress-test.js`) via `npm run test:load`.
- Mutation testing: Stryker (`stryker.config.json`) via `npm run test:mutate`.
- CI: GitHub Actions ejecuta validaciones en PR/push via `.github/workflows/ci.yml`.
- Estado de calidad actual: `type-check`, `lint`, `test` y `build` pasan en local.

### Frontend auth bypass (solo testing local)

- Variable: `FRONTEND_AUTH_BYPASS`
- Valores permitidos para activar bypass: `1`, `true`, `yes`
- Alcance: solo evita el redirect a `/auth/login` en guards de paginas frontend server-side
- Seguridad: en `NODE_ENV=production` el bypass se ignora siempre (fail-closed)
- Importante: no desactiva autenticacion de APIs ni cambia validacion backend/Supabase

### Guardrails locales (pre-commit / pre-push)

- `husky` para hooks de Git.
- `lint-staged` para ejecutar validaciones solo sobre archivos staged.
- `eslint` + `prettier` + `markdownlint-cli2` para estilo/consistencia.
- `secretlint` para detectar secretos antes de commit.
- `commitlint` (conventional commits) en `commit-msg`.
- `pre-push` bloqueante con `type-check`, `lint`, `test` y `build`.
- `spellcheck` disponible como chequeo asesor (`npm run spellcheck`) para evitar friccion por vocabulario bilingue.

## Arquitectura y proceso para trabajo en equipo

Para arrancar trabajo colaborativo con limites claros entre modulos y flujo de entrega:

- Arquitectura objetivo del equipo: `docs/architecture/team-architecture.md`
- Plan de endurecimiento de calidad: `docs/architecture/quality-hardening-plan.md`
- Onboarding tecnico: `docs/onboarding/developer-onboarding.md`
- ADR inicial (arquitectura modular + BFF): `docs/adr/ADR-001-modular-boundaries.md`

## Convenciones minimas de contribucion

- Todo cambio funcional debe incluir pruebas o evidencia de validacion.
- No mezclar refactor estructural con features en el mismo PR.
- Mantener boundaries de dominio: no importar infraestructura directamente en UI.
- Para cambios arquitectonicos, crear/actualizar ADR antes de mergear.

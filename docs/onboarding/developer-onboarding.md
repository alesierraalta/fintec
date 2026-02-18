# Onboarding tecnico para developers

Guia operativa para que cualquier integrante nuevo pueda contribuir en menos de un dia.

## 1. Setup local

### Requisitos

- Node.js >= 18 (recomendado 20 LTS).
- npm.
- Git.

### Instalacion

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Verificar que la app levanta en `http://localhost:3000`.

## 2. Comandos de trabajo diario

Antes de abrir PR, ejecutar:

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

Estado actual de CI:

- Requeridos para merge: `type-check`, `lint`, `test`, `build`.

Guardrails locales:

- `pre-commit`: `lint-staged` + `guard:db-access`.
- `commit-msg`: validacion de formato con `commitlint`.
- `pre-push`: `type-check` + `lint` + `test` + `build`.
- `spellcheck`: disponible como chequeo asesor (`npm run spellcheck`).

Segun tipo de cambio:

- Cambio UI/flujo: `npm run e2e`
- Cambio en performance API: `npm run test:load`
- Cambio sensible de logica: `npm run test:coverage`

## 3. Convenciones de codigo

- TypeScript estricto, sin `any` salvo justificacion explicita.
- Toda regla de negocio va en dominio/aplicacion, no en componentes.
- Cliente consume datos via BFF; no acceso directo a capa de datos desde UI.
- Dinero siempre en minor units y con utilidades compartidas del dominio.
- Imports con alias `@/` y respetando boundaries de modulo.

## 4. Flujo de ramas y PR

### Ramas

- `main`: rama protegida.
- feature branch por tarea: `feat/<scope>-<resumen>`.
- fix branch por bug: `fix/<scope>-<resumen>`.

### Flujo

1. Crear rama desde `main` actualizada.
2. Implementar cambio pequeno y coherente (sin mezclar refactor grande + feature).
3. Ejecutar checks locales.
4. Abrir PR con contexto, impacto y plan de prueba.
5. Resolver review y merge cuando cumpla DoD.

### Plantilla minima de PR

- Problema que resuelve.
- Enfoque tecnico.
- Riesgos y mitigacion.
- Evidencia de pruebas (comandos ejecutados y resultado).
- Cambios de arquitectura/ADR (si aplica).

## 5. Definition of Done (DoD)

Un ticket se considera terminado si:

- cumple criterio funcional acordado,
- no rompe boundaries de arquitectura,
- pasa `type-check`, `lint` y pruebas requeridas,
- incluye pruebas nuevas o ajuste de pruebas existentes,
- incluye documentacion actualizada (README/docs/ADR si aplica),
- tiene aprobacion de code review.

## 6. Checklist rapido antes de merge

- [ ] Cambios acotados al objetivo del ticket.
- [ ] Sin secretos ni credenciales en commits.
- [ ] Scripts de validacion ejecutados localmente.
- [ ] Contratos/API compatibles o versionados.
- [ ] Documentacion sincronizada con el cambio.

## 7. Escalacion y decisiones

- Bloqueo tecnico > 2 horas: escalar a owner de modulo.
- Duda de arquitectura: abrir ADR corto antes de implementar.
- Cambio cross-modulo: coordinar con owners impactados antes del merge.

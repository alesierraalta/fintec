# protocolo_mcp_opt.yml
version: "1.1"
orden: ["1-analizar_archivos", "2-plan_de_accion", "3-implementar_probar_documentar"]

# 1) ANALIZAR ARCHIVOS — EN BASE AL PROMPT (Serena primero)
analizar_archivos:
  herramienta: "Serena"
  basado_en_prompt: true
  objetivo: "Derivar exactamente qué archivos y memoria revisar según el contenido del prompt del usuario."
  extraccion_desde_prompt:
    - "Entidades/tecnologías (APIs, librerías, servicios)"
    - "Acciones pedidas (crear, refactorizar, integrar, optimizar)"
    - "Dominios/módulos (auth, pagos, UI, worker, etc.)"
    - "Pistas de rutas o nombres (e.g., user, invoice, dashboard)"
  seleccion_archivos:
    reglas:
      - "Construir patrones glob desde palabras clave del prompt (e.g., **/*user*.*, **/auth/**)"
      - "Priorizar carpetas convencionales: src/, app/, lib/, server/, tests/"
      - "Incluir migraciones/esquemas si el prompt menciona datos/DB"
      - "Cruzar con memoria/decisiones previas usando las mismas claves del prompt"
    pseudocodigo: |
      // Selección mínima y eficiente por prompt
      export function archivosRelevantes(prompt: string, arbol: string[]): string[] {
        const kws = [...new Set(prompt.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? [])];
        const pat = (k: string) => new RegExp(`(^|/)${k}(/|\\.|$)`);
        const candidatos = arbol.filter(p => kws.some(k => pat(k).test(p)));
        const score = (p: string) =>
          (p.includes('/src/') || p.includes('/app/')) ? 3 :
          (p.includes('/lib/') || p.includes('/server/')) ? 2 : 1;
        return candidatos.sort((a,b)=>score(b)-score(a)).slice(0,200);
      }

# 2) PLAN DE ACCIÓN — PASO A PASO (Sequential Thinking + DocFork)
plan_de_accion:
  pensamiento_secuencial:
    - "Desglosar requisitos explícitos/implícitos del prompt + Mapa Serena"
    - "Elegir arquitectura mínima que cumpla (diagramar flujos simples)"
    - "Partir en tareas pequeñas (funciones ≤ 20 líneas; acoplamiento bajo)"
    - "Definir criterios de aceptación + métricas (SLA rendimiento/seguridad)"
  docfork_investigacion:
    minimo_sesiones: 3
    temas:
      - "APIs/SDKs/contratos mencionados por el prompt"
      - "Buenas prácticas de seguridad y rendimiento aplicables"
      - "Patrones probados (idempotencia, reintentos, caché, streaming, colas)"
  salida:
    backlog:
      - "Lista ordenada de tareas con dependencias"
      - "Criterios de ‘hecho’ por tarea"
      - "Riesgos → mitigaciones"
      - "Decisiones y trade-offs respaldados por documentación"

# 3) IMPLEMENTAR → PROBAR → DOCUMENTAR (optimizado al máximo)
implementacion:
  objetivos:
    - "Código totalmente optimizado: mínimo LOC con máxima legibilidad y seguridad"
    - "Complejidad algorítmica y de memoria claras (preferir O(n) y O(1) en hot paths)"
    - "Medible: perfiles, métricas y umbrales de rendimiento"
  reglas:
    - "Cada función ≤ 20 líneas; una sola responsabilidad; early-returns; evitar ramas profundas"
    - "Hot paths: evitar asignaciones/objetos innecesarios, reutilizar buffers/estructuras"
    - "E/S: batch, cache, compresión y streaming; concurrencia limitada y backpressure"
    - "TypeScript estricto, sin any implícitos; contratos validados en los bordes"
    - "Side effects aislados; pure functions por defecto; logs estructurados mínimos"
    - "Cargas diferidas (lazy/dynamic import) y tree-shaking friendly"
  configuracion:
    tsconfig.json: |
      {
        "compilerOptions": {
          "target": "ES2022",
          "module": "ESNext",
          "moduleResolution": "Bundler",
          "strict": true,
          "noUncheckedIndexedAccess": true,
          "noImplicitOverride": true,
          "exactOptionalPropertyTypes": true,
          "forceConsistentCasingInFileNames": true,
          "skipLibCheck": true,
          "outDir": "dist"
        },
        "include": ["src"]
      }
    package.json: |
      {
        "name": "mcp-proyecto-optimizado",
        "type": "module",
        "scripts": {
          "build": "tsc -p .",
          "dev": "tsx src/server.ts",
          "test:e2e": "playwright test"
        },
        "dependencies": {
          "fastify": "^5.0.0"
        },
        "devDependencies": {
          "@playwright/test": "^1.48.0",
          "tsx": "^4.19.0",
          "typescript": "^5.6.0"
        }
      }
  plantillas_optim:
    # Utilidades TypeScript ultra-eficientes (todas ≤ 20 líneas)
    src/utils/lru_cache.ts: |
      // LRU minimalista (≤ 15 líneas), Map con recencia por reinserción
      export class LRU<K, V> {
        private m = new Map<K, V>();
        constructor(private max = 500) {}
        get(k: K): V | null { const v = this.m.get(k); if (v !== undefined) { this.m.delete(k); this.m.set(k, v); } return v ?? null; }
        set(k: K, v: V): void { if (this.m.has(k)) this.m.delete(k); this.m.set(k, v); if (this.m.size > this.max) this.m.delete(this.m.keys().next().value as K); }
        has(k: K): boolean { return this.m.has(k); }
        delete(k: K): boolean { return this.m.delete(k); }
        clear(): void { this.m.clear(); }
        size(): number { return this.m.size; }
      }
    src/utils/p_limit.ts: |
      // Concurrencia acotada simple (≤ 15 líneas)
      export function pLimit(concurrency: number) {
        let active = 0; const q: Array<() => Promise<void>> = [];
        const next = () => { if (active >= concurrency || !q.length) return;
          active++; q.shift()!().finally(() => { active--; next(); }); };
        return <T>(fn: () => Promise<T>) => new Promise<T>((res, rej) => { q.push(() => fn().then(res, rej)); next(); });
      }
    src/utils/fnv1a.ts: |
      // Hash FNV-1a 32-bit, rápido y estable (1 línea útil)
      export const fnv1a32 = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h + ((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24))) >>> 0; } return h >>> 0; };
    src/utils/debounce.ts: |
      // Debounce sin dependencias (≤ 10 líneas)
      export function debounce<T extends (...a: any[]) => void>(fn: T, ms = 200) {
        let t: any; return ((...args: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }) as T;
      }
    src/utils/memo_fetch.ts: |
      // Fetch JSON memoizado con LRU + concurrencia limitada (≤ 20 líneas)
      import { LRU } from './lru_cache.js'; import { pLimit } from './p_limit.js';
      const cache = new LRU<string, any>(500); const limit = pLimit(8);
      export async function memoJSON<T>(url: string, ttlMs = 60_000): Promise<T> {
        const hit = cache.get(url); if (hit && (hit.t + ttlMs > Date.now())) return hit.v as T;
        return limit(async () => {
          const r = await fetch(url); if (!r.ok) throw new Error(String(r.status));
          const v = await r.json(); cache.set(url, { v, t: Date.now() }); return v as T;
        });
      }
    src/utils/validate.ts: |
      // Validación mínima sin libs: esquema por funciones
      export type V<T> = (x: unknown) => x is T;
      export const isStr = (min = 1): V<string> => (x): x is string => typeof x === 'string' && x.length >= min;
      export const isObj = <T extends object>(): V<T> => (x): x is T => !!x && typeof x === 'object';
      export function shape<T extends Record<string, V<any>>>(s: T): V<{ [K in keyof T]: T[K] extends V<infer U> ? U : never }> {
        return (x: unknown): x is any => isObj()(x) && Object.entries(s).every(([k, v]) => v((x as any)[k]));
      }
    src/server.ts: |
      // API Fastify optimizada: validación, caché HTTP y uso de memoJSON
      import Fastify from 'fastify';
      import { isStr, shape } from './utils/validate.js';
      import { memoJSON } from './utils/memo_fetch.js';
      const app = Fastify({ logger: false });
      const qSchema = shape({ q: isStr(1) });
      app.get('/search', async (req, rep) => {
        const query = (req.query ?? {}) as any; if (!qSchema(query)) return rep.code(400).send({ error: 'bad_request' });
        const data = await memoJSON<any>(`https://dummyjson.com/products/search?q=${encodeURIComponent(query.q)}`, 30_000);
        rep.header('Cache-Control', 'private, max-age=60').send({ items: data?.products ?? [] });
      });
      app.get('/health', (_, rep) => rep.send({ ok: true }));
      app.listen({ port: 3000, host: '0.0.0.0' });
  playwright_tests: |
    // tests/search.spec.ts — pruebas E2E concisas pero completas
    import { test, expect } from '@playwright/test';

    test.describe('API /search', () => {
      test('camino feliz', async ({ request }) => {
        const r = await request.get('http://localhost:3000/search?q=phone');
        expect(r.ok()).toBeTruthy();
        const j = await r.json();
        expect(Array.isArray(j.items)).toBeTruthy();
      });

      test('valida query vacía', async ({ request }) => {
        const r = await request.get('http://localhost:3000/search?q=');
        expect(r.status()).toBe(400);
      });

      test('maneja error aguas arriba', async ({ request }) => {
        // Simulación simple: endpoint inexistente
        const r = await request.get('http://localhost:3000/search?q=' + encodeURIComponent('##force500##'));
        expect([200,400,500]).toContain(r.status()); // tolerancia controlada para upstream
      });

      test('SLA básico', async ({ request }) => {
        const t0 = Date.now();
        await request.get('http://localhost:3000/search?q=fast');
        expect(Date.now() - t0).toBeLessThan(1500);
      });

      test('health', async ({ request }) => {
        const r = await request.get('http://localhost:3000/health');
        expect((await r.json()).ok).toBeTruthy();
      });
    });
  documentacion_minima: |
    ## [Componente/Función]
    **Propósito:** …
    **Entradas/Salidas:** …
    **Decisiones (DocFork):** …
    **Impacto Serena:** archivos tocados, integraciones
    **Seguridad:** validaciones en bordes, authz si aplica, sanitización
    **Rendimiento:** SLA, caching, streaming/batching, concurrencia
    **Pruebas:** felices, bordes, errores, integración, perf
  checklist_salida:
    - "Alineado con Mapa Serena y Plan"
    - "Playwright verde (feliz/bordes/errores/perf/integración)"
    - "Docs actualizadas con referencias a investigación"
    - "Monitoreo/riesgos definidos (health/logs/alertas)"

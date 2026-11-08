/**
 * Deterministic generator for the agent v2 evaluation dataset.
 *
 *   npx tsx evals/agent-v2/generate-dataset.ts
 *
 * Writes evals/agent-v2/dataset/cases.json: seeded template cases plus the
 * hand-written hard cases in ./hard-cases.ts. Same seed, same output.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { HARD_CASES } from './hard-cases';
import type { AgentCurrency, AgentEvalCase } from './types';

const SEED = 20261107;
const OUTPUT = path.join(__dirname, 'dataset', 'cases.json');

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;

const ACCOUNTS_BY_CURRENCY: Record<AgentCurrency, string[]> = {
  VES: ['Banesco', 'Mercantil'],
  USD: ['Zelle', 'Efectivo'],
  USDT: ['Binance'],
};

const RANGES: Record<AgentCurrency, [number, number]> = {
  USD: [2, 250],
  USDT: [5, 400],
  VES: [80, 25000],
};

function amountFor(currency: AgentCurrency): number {
  const [min, max] = RANGES[currency];
  const raw = min + rand() * (max - min);
  if (currency === 'VES')
    return chance(0.3) ? Math.round(raw * 100) / 100 : Math.round(raw);
  return chance(0.25) ? Math.round(raw * 100) / 100 : Math.round(raw);
}

function vesFormat(n: number): string {
  const [int, dec] = n.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === '00' ? grouped : `${grouped},${dec}`;
}

function spokenAmount(amount: number, currency: AgentCurrency): string {
  if (currency === 'VES') {
    const n = chance(0.5) ? vesFormat(amount) : String(amount);
    return pick([
      `${n} Bs`,
      `${n} bs`,
      `Bs. ${n}`,
      `${n} bolos`,
      `${n} bolívares`,
      `${n}bs`,
    ]);
  }
  if (currency === 'USDT')
    return pick([`${amount} USDT`, `${amount} usdt`, `${amount} tether`]);
  return pick([
    `$${amount}`,
    `${amount}$`,
    `${amount} dólares`,
    `${amount} dolares`,
    `${amount} verdes`,
  ]);
}

const EXPENSE_ITEMS: Record<string, string[]> = {
  Alimentación: [
    'el mercado en el Central Madeirense',
    'unas empanadas',
    'el almuerzo',
    'pan y queso en la panadería',
    'la compra del abasto',
    'harina pan y arroz',
    'pollo en la carnicería',
    'unas arepas',
    'la charcutería',
    'café y cachitos',
    'la comida del Gama',
    'verduras en el mercado',
  ],
  Transporte: [
    'gasolina',
    'el taxi',
    'un Yummy',
    'el pasaje del bus',
    'el estacionamiento',
    'el peaje',
    'un mototaxi',
    'un Ridery',
    'el metro',
  ],
  Vivienda: [
    'el alquiler',
    'el condominio',
    'el plomero que arregló la tubería',
    'pintura para la casa',
    'la reparación del techo',
  ],
  Servicios: [
    'la luz de Corpoelec',
    'el internet de Inter',
    'el agua',
    'el plan de Movistar',
    'CANTV',
    'la recarga de Digitel',
    'el gas',
  ],
  Entretenimiento: [
    'Netflix',
    'el cine',
    'Spotify',
    'unas birras con los panas',
    'el concierto',
    'PlayStation Plus',
    'la rumba del sábado',
  ],
  Salud: [
    'la farmacia',
    'las pastillas de la tensión',
    'la consulta con el médico',
    'exámenes de laboratorio',
    'Farmatodo',
    'el dentista',
  ],
  Educación: [
    'la mensualidad del colegio',
    'el curso de inglés',
    'los libros de la universidad',
    'Platzi',
    'la matrícula de la uni',
  ],
  Compras: [
    'unos zapatos',
    'ropa en el Sambil',
    'un cargador',
    'unos audífonos',
    'un regalo de cumpleaños',
    'una franela',
  ],
  Carros: [
    'el cambio de aceite del carro',
    'los cauchos',
    'el mecánico',
    'la batería del carro',
    'el lavado del carro',
    'las pastillas de freno',
  ],
  Gimnasio: ['la mensualidad del gym', 'el gimnasio', 'las clases de crossfit'],
  Mascotas: [
    'comida para el perro',
    'el veterinario',
    'arena del gato',
    'la vacuna del perro',
  ],
  'Otros Gastos': ['una multa', 'la comisión del banco', 'una donación'],
};

const INCOME_ITEMS: Record<string, string[]> = {
  Salario: ['la quincena', 'el sueldo', 'la nómina', 'el salario del mes'],
  Freelance: [
    'un diseño para un cliente',
    'un proyecto freelance',
    'una página web que hice',
    'unas clases particulares',
  ],
  Inversiones: [
    'la ganancia de Binance',
    'los dividendos',
    'los intereses del plazo fijo',
  ],
  Remesas: [
    'la remesa que mandó mi mamá',
    'una ayuda familiar desde España',
    'lo que me mandó mi hermano de afuera',
  ],
  'Otros Ingresos': [
    'la bici que vendí',
    'un préstamo que me devolvieron',
    'un premio de una rifa',
  ],
};

const EXPENSE_TEMPLATES = [
  (a: string, i: string) => `gasté ${a} en ${i}`,
  (a: string, i: string) => `pagué ${i}, ${a}`,
  (a: string, i: string) => `${a} de ${i}`,
  (a: string, i: string) => `compré ${i} por ${a}`,
  (a: string, i: string) => `se me fueron ${a} en ${i}`,
  (a: string, i: string) => `me cobraron ${a} por ${i}`,
  (a: string, i: string) => `registra un gasto de ${a} en ${i}`,
  (a: string, i: string) => `anota ${a} de ${i}`,
  (a: string, i: string) => `gaste ${a} en ${i}`,
  (a: string, i: string) => `hoy pague ${i} ${a}`,
];

const INCOME_TEMPLATES = [
  (a: string, i: string) => `me pagaron ${a} por ${i}`,
  (a: string, i: string) => `cobré ${a} de ${i}`,
  (a: string, i: string) => `me cayó ${i}, ${a}`,
  (a: string, i: string) => `registra un ingreso de ${a} por ${i}`,
  (a: string, i: string) => `me entraron ${a} de ${i}`,
  (a: string, i: string) => `recibí ${a} por ${i}`,
];

const TRANSFER_TEMPLATES = [
  (a: string, f: string, t: string) => `pasa ${a} de ${f} a ${t}`,
  (a: string, f: string, t: string) => `transfiere ${a} de ${f} a ${t}`,
  (a: string, f: string, t: string) => `mueve ${a} desde ${f} hacia ${t}`,
  (a: string, f: string, t: string) => `pasé ${a} de mi cuenta ${f} a ${t}`,
  (a: string, f: string, t: string) =>
    `hice una transferencia de ${a} de ${f} a ${t}`,
  (a: string, f: string, t: string) => `me transferí ${a} de ${f} a ${t}`,
  (a: string, f: string, t: string) =>
    `quiero hacer una transferencia de ${a} desde ${f} a mi ${t}`,
];

const NUMBER_WORDS = ['dos', 'tres', 'cuatro', 'cinco', 'seis'];
const DEFERRED_TEMPLATES = [
  (n: string) => `hice ${n} gastos hoy, ahorita te paso los tickets`,
  (n: string) => `tengo ${n} facturas que registrar`,
  (n: string) => `hoy pagué ${n} cosas, después te mando las fotos`,
  (n: string) =>
    `registra ${n} gastos, no me acuerdo los montos, te paso los recibos`,
  (n: string) => `anota ${n} compras de esta semana, te subo las facturas`,
];

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
];
const QUERY_TEMPLATES = [
  (c: string) => `cuánto gasté en ${c.toLowerCase()} este mes`,
  (c: string) => `cuanto llevo gastado en ${c.toLowerCase()}`,
  (c: string) => `dame el total de ${c.toLowerCase()} de ${pick(MONTHS)}`,
  (c: string) => `cuánta plata se me ha ido en ${c.toLowerCase()} este año`,
];
const SEARCH_TERMS = [
  'Netflix',
  'Farmatodo',
  'Corpoelec',
  'el Sambil',
  'los cauchos',
  'Platzi',
  'Spotify',
  'el veterinario',
  'el Central Madeirense',
  'Ridery',
];
const SEARCH_TEMPLATES = [
  (t: string) => `busca mis pagos de ${t}`,
  (t: string) => `encuentra lo que pagué en ${t}`,
  (t: string) => `muéstrame las compras de ${t}`,
  (t: string) => `dónde está lo de ${t}`,
];
const BALANCE_TEMPLATES = [
  (a: string) => `cuánto tengo en ${a}`,
  (a: string) => `cuál es el saldo de ${a}`,
  (a: string) => `cuánta plata me queda en ${a}`,
  () => 'cuánto dinero tengo en total',
  () => 'dame mis saldos',
];

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateCases(): AgentEvalCase[] {
  const cases: AgentEvalCase[] = [];
  const seen = new Set<string>();
  let n = 0;
  const push = (c: Omit<AgentEvalCase, 'id' | 'hard'>) => {
    const key = normalizeKey(c.utterance);
    if (seen.has(key)) return;
    seen.add(key);
    cases.push({
      id: `gen-${String(++n).padStart(4, '0')}`,
      hard: false,
      ...c,
    });
  };

  for (const [category, items] of Object.entries(EXPENSE_ITEMS)) {
    for (let k = 0; k < 15; k++) {
      const currency = pick<AgentCurrency>([
        'USD',
        'USD',
        'VES',
        'VES',
        'USDT',
      ]);
      const amount = amountFor(currency);
      const withAccount = chance(0.5);
      const account = withAccount
        ? pick(ACCOUNTS_BY_CURRENCY[currency])
        : undefined;
      let utterance = pick(EXPENSE_TEMPLATES)(
        spokenAmount(amount, currency),
        pick(items)
      );
      if (account)
        utterance += pick([
          ` con ${account}`,
          ` desde ${account}`,
          ` por ${account}`,
        ]);
      push({
        utterance,
        intent: 'create_expense',
        expected: { type: 'EXPENSE', category, account, amount, currency },
      });
    }
  }

  for (const [category, items] of Object.entries(INCOME_ITEMS)) {
    for (let k = 0; k < 12; k++) {
      const currency = pick<AgentCurrency>(['USD', 'VES', 'USDT']);
      const amount = amountFor(currency) * (category === 'Salario' ? 3 : 1);
      const rounded = Math.round(amount * 100) / 100;
      const account = chance(0.6)
        ? pick(ACCOUNTS_BY_CURRENCY[currency])
        : undefined;
      let utterance = pick(INCOME_TEMPLATES)(
        spokenAmount(rounded, currency),
        pick(items)
      );
      if (account)
        utterance += pick([
          ` en ${account}`,
          ` a ${account}`,
          ` por ${account}`,
        ]);
      push({
        utterance,
        intent: 'create_income',
        expected: {
          type: 'INCOME',
          category,
          account,
          amount: rounded,
          currency,
        },
      });
    }
  }

  const allAccounts = Object.values(ACCOUNTS_BY_CURRENCY).flat();
  for (let k = 0; k < 70; k++) {
    const from = pick(allAccounts);
    const to = pick(allAccounts.filter((a) => a !== from));
    const currency = (Object.entries(ACCOUNTS_BY_CURRENCY).find(([, list]) =>
      list.includes(from)
    )?.[0] ?? 'USD') as AgentCurrency;
    const amount = amountFor(currency);
    push({
      utterance: pick(TRANSFER_TEMPLATES)(
        spokenAmount(amount, currency),
        from,
        to
      ),
      intent: 'create_transfer',
      expected: { account: from, toAccount: to, amount, currency },
    });
  }

  for (let k = 0; k < 30; k++) {
    const count = 2 + Math.floor(rand() * 5);
    const word = chance(0.5) ? String(count) : NUMBER_WORDS[count - 2];
    push({
      utterance: pick(DEFERRED_TEMPLATES)(word),
      intent: 'deferred_expenses',
      expected: { type: 'EXPENSE', count },
    });
  }

  for (const category of [
    ...Object.keys(EXPENSE_ITEMS),
    ...Object.keys(INCOME_ITEMS),
  ]) {
    for (let k = 0; k < 2; k++) {
      push({
        utterance: pick(QUERY_TEMPLATES)(category),
        intent: 'query',
        expected: { category },
      });
    }
  }

  for (let k = 0; k < 25; k++) {
    push({
      utterance: pick(SEARCH_TEMPLATES)(pick(SEARCH_TERMS)),
      intent: 'search',
      expected: {},
    });
  }

  for (let k = 0; k < 20; k++) {
    const account = pick(allAccounts);
    const template = pick(BALANCE_TEMPLATES);
    const utterance = template(account);
    push({
      utterance,
      intent: 'balance',
      expected: utterance.includes(account) ? { account } : {},
    });
  }

  const hard = HARD_CASES.map((c, index) => ({
    ...c,
    id: `hard-${String(index + 1).padStart(3, '0')}`,
    hard: true,
  }));
  for (const c of hard) {
    const key = normalizeKey(c.utterance);
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push(c);
  }
  return cases;
}

if (require.main === module) {
  const cases = generateCases();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(cases, null, 2)}\n`);
  console.log(
    `wrote ${cases.length} cases to ${path.relative(process.cwd(), OUTPUT)}`
  );
}

import type { AgentEvalCase } from './types';

type HardCase = Omit<AgentEvalCase, 'id' | 'hard'>;

const expense = (
  utterance: string,
  category: string,
  amount: number,
  currency: 'USD' | 'VES' | 'USDT',
  account?: string,
  acceptedCategories?: string[]
): HardCase => ({
  utterance,
  intent: 'create_expense',
  ...(acceptedCategories ? { acceptedCategories } : {}),
  expected: { type: 'EXPENSE', category, amount, currency, account },
});

const income = (
  utterance: string,
  category: string,
  amount: number,
  currency: 'USD' | 'VES' | 'USDT',
  account?: string
): HardCase => ({
  utterance,
  intent: 'create_income',
  expected: { type: 'INCOME', category, amount, currency, account },
});

const transfer = (
  utterance: string,
  account: string,
  toAccount: string,
  amount: number,
  currency: 'USD' | 'VES' | 'USDT'
): HardCase => ({
  utterance,
  intent: 'create_transfer',
  expected: { account, toAccount, amount, currency },
});

const deferred = (utterance: string, count: number): HardCase => ({
  utterance,
  intent: 'deferred_expenses',
  expected: { type: 'EXPENSE', count },
});

const ask = (utterance: string): HardCase => ({
  utterance,
  intent: 'ambiguous_needs_clarification',
  expected: {},
});

/**
 * Hand-written hard cases: the real bugs reported by the user (L2), voice
 * transcripts, typos, number words, third-party vs own-account transfers and
 * income/expense confusion.
 */
export const HARD_CASES: HardCase[] = [
  // The reported bug: own-account transfers recorded as expenses.
  transfer(
    'quiero hacer una transferencia de 7000 dólares de Zelle a Binance',
    'Zelle',
    'Binance',
    7000,
    'USD'
  ),
  transfer(
    'pasa siete mil dolares de zelle pa binance',
    'Zelle',
    'Binance',
    7000,
    'USD'
  ),
  transfer(
    'me transferi 100 de banesco a mercantil',
    'Banesco',
    'Mercantil',
    100,
    'VES'
  ),
  transfer(
    'mueve 250$ del efectivo a zelle que lo deposité',
    'Efectivo',
    'Zelle',
    250,
    'USD'
  ),
  transfer(
    'saqué 40 dólares de Zelle en efectivo',
    'Zelle',
    'Efectivo',
    40,
    'USD'
  ),
  transfer(
    'vendí 100 usdt de binance y me cayeron en banesco',
    'Binance',
    'Banesco',
    100,
    'USDT'
  ),
  transfer(
    'eh pasé como quinientos bolos de mercantil a banesco',
    'Mercantil',
    'Banesco',
    500,
    'VES'
  ),
  transfer(
    'hice un pago móvil de 3.000 Bs de Banesco a mi Mercantil',
    'Banesco',
    'Mercantil',
    3000,
    'VES'
  ),
  transfer(
    'envié 50$ a mi cuenta de Binance desde Zelle',
    'Zelle',
    'Binance',
    50,
    'USD'
  ),
  transfer(
    'recarga binance con 80 dolares del zelle',
    'Zelle',
    'Binance',
    80,
    'USD'
  ),
  transfer(
    'transfiere 1.250,50 Bs de Mercantil a Banesco',
    'Mercantil',
    'Banesco',
    1250.5,
    'VES'
  ),
  transfer(
    'deposité 300 dólares en efectivo a Zelle',
    'Efectivo',
    'Zelle',
    300,
    'USD'
  ),

  // Paying third parties IS an expense, not an own-account transfer.
  expense(
    'le transferí 30$ a mi hermano que le debía',
    'Otros Gastos',
    30,
    'USD'
  ),
  expense(
    'pago movil de 500bs a la señora de las empanadas',
    'Alimentación',
    500,
    'VES'
  ),
  expense(
    'le hice un zelle de 60 al mecánico por los frenos',
    'Carros',
    60,
    'USD',
    'Zelle'
  ),
  expense(
    'transferí 120 dólares al dueño del apartamento por el alquiler',
    'Vivienda',
    120,
    'USD'
  ),
  expense(
    'le pasé 15 usdt al pana del gym por la mensualidad',
    'Gimnasio',
    15,
    'USDT',
    'Binance'
  ),
  expense('pago móvil de 2.300 Bs al veterinario', 'Mascotas', 2300, 'VES'),

  // Category traps that used to land in "Carros".
  expense('gasté 12 dólares en almuerzo', 'Alimentación', 12, 'USD'),
  expense('gaste 15 en almuerso', 'Alimentación', 15, 'USD'),
  expense('compre medicinas en farmatodo 22$', 'Salud', 22, 'USD'),
  expense('pague la luz 300 bs', 'Servicios', 300, 'VES'),
  expense('netflix 7.99', 'Entretenimiento', 7.99, 'USD'),
  expense('se me fueron 45 lucas en el mercado', 'Alimentación', 45, 'USD'),
  expense(
    'mensualidad del colegio de la niña 80 dólares',
    'Educación',
    80,
    'USD'
  ),
  expense('unos tenis en el sambil 65$', 'Compras', 65, 'USD'),
  // Fuel can also be filed under the user's vehicle category.
  expense(
    'le eché gasolina al carro, 10 dólares',
    'Transporte',
    10,
    'USD',
    undefined,
    ['Transporte', 'Carros']
  ),
  expense('cambio de aceite 35$', 'Carros', 35, 'USD'),
  expense(
    'los cauchos nuevos me salieron en 280 dólares',
    'Carros',
    280,
    'USD'
  ),
  // Condominium fees can also be classified as services.
  expense('pagué el condominio, 40 verdes', 'Vivienda', 40, 'USD', undefined, [
    'Vivienda',
    'Servicios',
  ]),
  expense('la recarga de movistar 200 bolos', 'Servicios', 200, 'VES'),
  expense('el internet 25$ con zelle', 'Servicios', 25, 'USD', 'Zelle'),
  expense('fuimos al cine y gastamos 18 dolares', 'Entretenimiento', 18, 'USD'),
  expense('consulta con el pediatra 40$', 'Salud', 40, 'USD'),
  expense('perrarina 30 dolares', 'Mascotas', 30, 'USD'),
  expense('un yummy de 4 dolares', 'Transporte', 4, 'USD'),
  expense(
    'el curso de inglés me costó 60 usdt',
    'Educación',
    60,
    'USDT',
    'Binance'
  ),
  expense('comision del banco 50 bs', 'Otros Gastos', 50, 'VES'),
  expense(
    'pagué 1.500 Bs de estacionamiento con Banesco',
    'Transporte',
    1500,
    'VES',
    'Banesco'
  ),

  // Voice transcripts with filler words and number words.
  expense('eh gasté como veinte dólares en la farmacia', 'Salud', 20, 'USD'),
  expense(
    'este... pagué treinta dólares de mercado',
    'Alimentación',
    30,
    'USD'
  ),
  expense(
    'o sea me cobraron cien bolívares por el pasaje',
    'Transporte',
    100,
    'VES'
  ),
  expense('mira anota que gasté cincuenta en ropa', 'Compras', 50, 'USD'),
  expense(
    'ehhh la luz salió en mil doscientos bolos',
    'Servicios',
    1200,
    'VES'
  ),
  income(
    'mira me pagaron la quincena trescientos dólares',
    'Salario',
    300,
    'USD'
  ),
  income(
    'me cayó la nómina, dos mil quinientos bolívares en banesco',
    'Salario',
    2500,
    'VES',
    'Banesco'
  ),

  // Income vs expense confusion.
  income('me pagaron 200$ por un diseño', 'Freelance', 200, 'USD'),
  income(
    'me hicieron un pago móvil de 1200 bs por un diseño',
    'Freelance',
    1200,
    'VES'
  ),
  income('mi mamá me mandó 100 dólares', 'Remesas', 100, 'USD'),
  income(
    'me devolvieron 20 dólares que le presté a un pana',
    'Otros Ingresos',
    20,
    'USD'
  ),
  income('vendí la bici en 90$', 'Otros Ingresos', 90, 'USD'),
  income(
    'cobré 450 dólares de sueldo por zelle',
    'Salario',
    450,
    'USD',
    'Zelle'
  ),
  income(
    'gané 35 usdt en binance con el staking',
    'Inversiones',
    35,
    'USDT',
    'Binance'
  ),
  income(
    'un cliente me pagó 150 usdt por una página web',
    'Freelance',
    150,
    'USDT',
    'Binance'
  ),
  income('me entró la remesa de mi hermano, 80$', 'Remesas', 80, 'USD'),
  income(
    'ingreso de 5.000 Bs por clases particulares',
    'Freelance',
    5000,
    'VES'
  ),
  income(
    'me pagaron el bono de fin de año, 600 dólares',
    'Salario',
    600,
    'USD'
  ),
  income(
    'recibí 40 dólares de regalo de cumpleaños',
    'Otros Ingresos',
    40,
    'USD'
  ),

  // Deferred expenses: no amounts, receipts later.
  deferred(
    'hice tres gastos hoy pero no me acuerdo cuánto, te paso los tickets',
    3
  ),
  deferred('fui al mercado y a la farmacia, después te mando las facturas', 2),
  deferred('registra 4 gastos y te subo las fotos de los recibos', 4),
  deferred('tengo un montón de facturas, son como cinco, te las paso', 5),
  deferred('pagué el gas, la luz y el agua, te mando los comprobantes', 3),
  deferred('hice dos compras en el sambil, ahí te van los tickets', 2),
  deferred('mira hice tantos gastos, como seis, ahorita te paso las fotos', 6),
  deferred(
    'anota los gastos del viaje, te mando las facturas, fueron cuatro',
    4
  ),

  // Ambiguous: must ask instead of writing.
  ask('gasté plata'),
  ask('pagué eso'),
  ask('registra un gasto'),
  ask('transfiere 50'),
  ask('anota 20'),
  ask('pasa 100 a banesco'),
  ask('registra lo de ayer'),
  ask('me cobraron'),
  ask('pon un ingreso'),
  ask('haz una transferencia'),
  ask('gasté 30'),
  ask('mueve la plata'),

  // Queries, searches and balances phrased loosely.
  { utterance: 'en qué se me va más la plata', intent: 'query', expected: {} },
  {
    utterance: 'cuánto me entró este mes',
    intent: 'query',
    expected: { type: 'INCOME' },
  },
  {
    utterance: 'cuánto gasté la semana pasada en total',
    intent: 'query',
    expected: { type: 'EXPENSE' },
  },
  {
    utterance: 'cuanto e gastado en el carro este año',
    intent: 'query',
    expected: { category: 'Carros' },
  },
  {
    utterance: 'búscame lo que pagué en farmatodo',
    intent: 'search',
    expected: {},
  },
  {
    utterance: 'dónde quedó el pago del mecánico',
    intent: 'search',
    expected: {},
  },
  {
    utterance: 'cuánto tengo en binance',
    intent: 'balance',
    expected: { account: 'Binance' },
  },
  { utterance: 'cuánta plata me queda', intent: 'balance', expected: {} },
  {
    utterance: 'cuanto hay en zelle',
    intent: 'balance',
    expected: { account: 'Zelle' },
  },
  // Venezuelan thousands grouping and decimal comma, including an ungrouped control.
  expense('gaste 7.933bs en el mercado', 'Alimentación', 7933, 'VES'),
  expense('gaste 20.704bs en el mercado', 'Alimentación', 20704, 'VES'),
  expense('gasté 15.756 Bs en el mercado', 'Alimentación', 15756, 'VES'),
  expense('gasté Bs. 3.148,19 en el mercado', 'Alimentación', 3148.19, 'VES'),
  expense('gasté 12,50 Bs en el mercado', 'Alimentación', 12.5, 'VES'),
];

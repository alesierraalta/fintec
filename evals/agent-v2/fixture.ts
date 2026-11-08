import { AccountType, type Account, type Category } from '@/types/domain';
import type { AgentCurrency } from './types';

export const FIXTURE_USER_ID = 'eval-user-v2';

interface FixtureAccount {
  id: string;
  name: string;
  currencyCode: AgentCurrency;
}

export const FIXTURE_ACCOUNTS: FixtureAccount[] = [
  { id: 'acc-banesco', name: 'Banesco', currencyCode: 'VES' },
  { id: 'acc-mercantil', name: 'Mercantil', currencyCode: 'VES' },
  { id: 'acc-zelle', name: 'Zelle', currencyCode: 'USD' },
  { id: 'acc-binance', name: 'Binance', currencyCode: 'USDT' },
  { id: 'acc-efectivo', name: 'Efectivo', currencyCode: 'USD' },
];

type Kind = 'INCOME' | 'EXPENSE';

// Defaults mirror repositories/local/db.ts (user_id NULL in Supabase).
const DEFAULTS: Array<[string, string, Kind]> = [
  ['def-salario', 'Salario', 'INCOME'],
  ['def-freelance', 'Freelance', 'INCOME'],
  ['def-inversiones', 'Inversiones', 'INCOME'],
  ['def-otros-ingresos', 'Otros Ingresos', 'INCOME'],
  ['def-alimentacion', 'Alimentación', 'EXPENSE'],
  ['def-transporte', 'Transporte', 'EXPENSE'],
  ['def-vivienda', 'Vivienda', 'EXPENSE'],
  ['def-servicios', 'Servicios', 'EXPENSE'],
  ['def-entretenimiento', 'Entretenimiento', 'EXPENSE'],
  ['def-salud', 'Salud', 'EXPENSE'],
  ['def-educacion', 'Educación', 'EXPENSE'],
  ['def-compras', 'Compras', 'EXPENSE'],
  ['def-otros-gastos', 'Otros Gastos', 'EXPENSE'],
];

// "Carros" is the custom category that used to swallow every chat expense (#113).
const CUSTOM: Array<[string, string, Kind]> = [
  ['usr-carros', 'Carros', 'EXPENSE'],
  ['usr-gimnasio', 'Gimnasio', 'EXPENSE'],
  ['usr-mascotas', 'Mascotas', 'EXPENSE'],
  ['usr-remesas', 'Remesas', 'INCOME'],
];

const STAMP = '2026-01-01T00:00:00.000Z';

export const FIXTURE_CATEGORIES: Category[] = [
  ...DEFAULTS.map(([id, name, kind]) => ({
    id,
    name,
    kind,
    userId: null,
    isDefault: true,
  })),
  ...CUSTOM.map(([id, name, kind]) => ({
    id,
    name,
    kind,
    userId: FIXTURE_USER_ID,
    isDefault: false,
  })),
].map((c) => ({
  ...c,
  kind: c.kind as Category['kind'],
  color: '#64748b',
  icon: 'Tag',
  active: true,
  createdAt: STAMP,
  updatedAt: STAMP,
}));

export function fixtureAccountsAsDomain(): Account[] {
  return FIXTURE_ACCOUNTS.map((a) => ({
    ...a,
    userId: FIXTURE_USER_ID,
    type: AccountType.BANK,
    balance: 0,
    active: true,
    createdAt: STAMP,
    updatedAt: STAMP,
  }));
}

export function categoryKind(name: string): Kind | undefined {
  return FIXTURE_CATEGORIES.find((c) => c.name === name)?.kind as
    Kind | undefined;
}

export function accountCurrency(name: string): AgentCurrency | undefined {
  return FIXTURE_ACCOUNTS.find((a) => a.name === name)?.currencyCode;
}

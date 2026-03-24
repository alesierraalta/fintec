/**
 * FinTec Performance Testing — Synthetic Data Generators
 *
 * Generates realistic financial test data for load testing.
 * All data is synthetic — no real financial data is ever used.
 */

import { randomIntBetween, randomItem, uuidv4 } from './jslib.js';

/**
 * Transaction types with realistic distribution weights.
 */
const TRANSACTION_TYPES = [
  { type: 'EXPENSE', weight: 0.65 },
  { type: 'INCOME', weight: 0.35 },
];

/**
 * Supported currencies.
 */
const CURRENCIES = ['USD', 'VES', 'EUR'];

/**
 * Expense categories for realistic data.
 */
const EXPENSE_CATEGORIES = [
  'Groceries',
  'Transport',
  'Dining',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Shopping',
  'Education',
  'Subscriptions',
  'Others',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Refund',
  'Others',
];

const ACCOUNT_TYPES = ['BANK', 'CASH', 'INVESTMENT', 'SAVINGS'];

const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

const CATEGORY_COLORS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed'];

const CATEGORY_ICONS = ['Tag', 'Wallet', 'Briefcase', 'TrendingUp', 'Coins'];

/**
 * Generate a random integer between min and max (inclusive).
 */
function randomInt(min, max) {
  return randomIntBetween(min, max);
}

/**
 * Pick a random item from an array.
 */
function randomPick(arr) {
  return randomItem(arr);
}

/**
 * Pick a transaction type based on weighted distribution.
 * 65% expense, 35% income.
 */
function weightedTransactionType() {
  const rand = Math.random();
  let cumulative = 0;
  for (const { type, weight } of TRANSACTION_TYPES) {
    cumulative += weight;
    if (rand <= cumulative) return type;
  }
  return 'EXPENSE';
}

/**
 * Generate a realistic transaction amount in minor units (cents).
 * Range: $0.50 – $5,000.00 (50 – 500000 cents)
 * Distribution: Most transactions are small (< $100)
 */
export function generateAmount() {
  const rand = Math.random();
  if (rand < 0.5) {
    // 50%: small amounts ($0.50 - $50)
    return randomInt(50, 5000);
  } else if (rand < 0.85) {
    // 35%: medium amounts ($50 - $500)
    return randomInt(5000, 50000);
  } else {
    // 15%: large amounts ($500 - $5000)
    return randomInt(50000, 500000);
  }
}

/**
 * Generate a complete transaction payload for POST /api/transactions.
 *
 * @param {object|string} [options]
 * @param {string} [options.accountId]
 * @param {string} [options.categoryId]
 * @param {string} [options.type]
 * @param {string} [options.currencyCode]
 * @returns {object} Transaction payload
 */
export function generateTransaction(options = {}) {
  const normalizedOptions =
    typeof options === 'string' ? { accountId: options } : options;

  const type = normalizedOptions.type || weightedTransactionType();
  const categories =
    type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const currencyCode = normalizedOptions.currencyCode || randomPick(CURRENCIES);
  const amount = generateAmount();

  return {
    accountId: normalizedOptions.accountId,
    categoryId: normalizedOptions.categoryId,
    amount,
    currencyCode,
    type,
    description: `Perf ${type.toLowerCase()} ${uuidv4().slice(0, 8)}`,
    note: `Synthetic payload ${uuidv4().slice(0, 6)}`,
    tags: ['perf', type.toLowerCase(), randomPick(categories).toLowerCase()],
    date: new Date().toISOString(),
  };
}

/**
 * Generate an account creation payload for POST /api/accounts.
 *
 * @returns {object} Account payload
 */
export function generateAccount() {
  const institutions = [
    'Chase',
    'BOA',
    'Wells Fargo',
    'Citibank',
    'Capital One',
  ];

  return {
    name: `Perf Account ${uuidv4().slice(0, 8)}`,
    type: randomPick(ACCOUNT_TYPES),
    currencyCode: randomPick(CURRENCIES),
    balance: generateAmount(),
    institution: randomPick(institutions),
    active: true,
  };
}

/**
 * Generate a category payload for POST /api/categories.
 *
 * @param {'EXPENSE'|'INCOME'} [kind]
 * @returns {object} Category payload
 */
export function generateCategory(kind = 'EXPENSE') {
  const names = kind === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return {
    name: `Perf ${randomPick(names)} ${uuidv4().slice(0, 6)}`,
    kind,
    color: randomPick(CATEGORY_COLORS),
    icon: randomPick(CATEGORY_ICONS),
    active: true,
    isDefault: false,
  };
}

/**
 * Generate a transfer payload for POST /api/transfers.
 *
 * @param {string} fromAccountId
 * @param {string} toAccountId
 * @returns {object} Transfer payload
 */
export function generateTransfer(fromAccountId, toAccountId) {
  const amountMajor = Number((randomInt(100, 5000) / 100).toFixed(2));

  return {
    fromAccountId,
    toAccountId,
    amount: amountMajor,
    currency: 'USD',
    description: `Perf transfer ${uuidv4().slice(0, 8)}`,
    date: new Date().toISOString(),
  };
}

/**
 * Generate a recurring transaction payload for POST /api/recurring-transactions.
 *
 * @param {string} accountId
 * @param {string} [categoryId]
 * @param {'EXPENSE'|'INCOME'} [type]
 * @returns {object}
 */
export function generateRecurringTransaction(
  accountId,
  categoryId,
  type = 'EXPENSE'
) {
  const startDate = new Date().toISOString().slice(0, 10);

  return {
    name: `Perf recurring ${uuidv4().slice(0, 8)}`,
    type,
    accountId,
    categoryId,
    currencyCode: randomPick(CURRENCIES),
    amountMinor: generateAmount(),
    description: `Recurring ${type.toLowerCase()} test`,
    frequency: randomPick(RECURRENCE_FREQUENCIES),
    intervalCount: 1,
    startDate,
    isActive: true,
  };
}

/**
 * Generate a batch of transactions for bulk testing.
 *
 * @param {number} count Number of transactions to generate
 * @param {string} [accountId]
 * @returns {object[]}
 */
export function generateTransactionBatch(count, options = {}) {
  return Array.from({ length: count }, () => generateTransaction(options));
}

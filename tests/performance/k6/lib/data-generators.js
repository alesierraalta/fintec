/**
 * FinTec Performance Testing — Synthetic Data Generators
 *
 * Generates realistic financial test data for load testing.
 * All data is synthetic — no real financial data is ever used.
 */

/**
 * Transaction types with realistic distribution weights.
 */
const TRANSACTION_TYPES = [
  { type: 'EXPENSE', weight: 0.6 },
  { type: 'INCOME', weight: 0.3 },
  { type: 'TRANSFER', weight: 0.1 },
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

/**
 * Generate a random integer between min and max (inclusive).
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array.
 */
function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * Pick a transaction type based on weighted distribution.
 * 60% expense, 30% income, 10% transfer.
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
 * @param {string} [accountId] Optional account ID to associate
 * @returns {object} Transaction payload
 */
export function generateTransaction(accountId) {
  const type = weightedTransactionType();
  const categories =
    type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return {
    amount: generateAmount(),
    currency: randomPick(CURRENCIES),
    type,
    category: type !== 'TRANSFER' ? randomPick(categories) : undefined,
    description: `Perf test ${type.toLowerCase()} ${Date.now()}`,
    date: new Date().toISOString(),
    accountId: accountId || undefined,
  };
}

/**
 * Generate an account creation payload for POST /api/accounts.
 *
 * @returns {object} Account payload
 */
export function generateAccount() {
  const accountTypes = ['BANK', 'CASH', 'INVESTMENT'];
  const banks = ['Chase', 'BOA', 'Wells Fargo', 'Citibank', 'Capital One'];

  return {
    name: `Perf Test Account ${randomInt(1, 9999)}`,
    type: randomPick(accountTypes),
    currency: randomPick(CURRENCIES),
    balance: generateAmount(),
    institution: randomPick(banks),
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
  return {
    fromAccountId,
    toAccountId,
    amount: randomInt(1000, 50000), // $10 - $500
    currency: 'USD',
    description: `Perf test transfer ${Date.now()}`,
    date: new Date().toISOString(),
  };
}

/**
 * Generate a batch of transactions for bulk testing.
 *
 * @param {number} count Number of transactions to generate
 * @param {string} [accountId]
 * @returns {object[]}
 */
export function generateTransactionBatch(count, accountId) {
  return Array.from({ length: count }, () => generateTransaction(accountId));
}

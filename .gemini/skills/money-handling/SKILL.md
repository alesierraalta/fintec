---
name: money-handling
description: >
  Critical patterns for handling money in FinTec with precision and correctness.
  Trigger: Creating transactions, accounts, budgets, financial calculations, currency conversions.
metadata:
  version: '1.0'
  scope: [root]
  auto_invoke: 'Working with money, transactions, accounts, budgets, or financial data'
allowed-tools: Read, Edit, Write, Grep, Task
---

## When to Use

Use this skill when:

- Creating or modifying transactions
- Handling account balances
- Performing currency conversions
- Calculating budgets or financial goals
- Displaying monetary values
- Any operation involving money

---

## Critical Patterns

### ⚠️ RULE #1: ALWAYS Use Minor Units (Centavos)

**NEVER store money as floats or decimals. ALWAYS use integers representing the smallest currency unit.**

```typescript
// ❌ WRONG - Floating point errors
const amount = 10.50; // NEVER DO THIS

// ✅ CORRECT - Integer minor units (centavos)
const amountInCents = 1050; // $10.50 = 1050 centavos
```

### Pattern 1: Creating Money Values

```typescript
import { createMoney, formatMoney } from '@/lib/money';

// Create from major units (dollars)
const money = createMoney(10.50, 'USD'); 
// Returns: { amount: 1050, currency: 'USD' }

// Format for display
const formatted = formatMoney(money); 
// Returns: "$10.50"
```

### Pattern 2: Money Calculations

```typescript
import { addMoney, subtractMoney, multiplyMoney } from '@/lib/money';

const balance = createMoney(100, 'USD');
const expense = createMoney(25.50, 'USD');

// Addition
const newBalance = addMoney(balance, expense);
// { amount: 12550, currency: 'USD' }

// Subtraction
const remaining = subtractMoney(balance, expense);
// { amount: 7450, currency: 'USD' }

// Multiplication (for percentages, etc.)
const tax = multiplyMoney(expense, 0.16); // 16% tax
```

### Pattern 3: Currency Conversion

```typescript
import { convertMoney } from '@/lib/money';

const usdAmount = createMoney(100, 'USD');
const exchangeRate = 36.50; // 1 USD = 36.50 VES

const vesAmount = convertMoney(usdAmount, 'VES', exchangeRate);
// { amount: 365000, currency: 'VES' } // 3650.00 VES in centavos
```

---

## Database Storage

### Schema Pattern

```typescript
// ✅ CORRECT - Store as INTEGER
interface Transaction {
  id: string;
  amount: number;        // INTEGER in minor units (centavos)
  currency: string;      // 'USD', 'VES', etc.
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

// Example in database:
// amount: 1050 (represents $10.50)
// currency: 'USD'
```

### Supabase Schema

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  amount BIGINT NOT NULL,           -- Minor units (centavos)
  currency VARCHAR(3) NOT NULL,     -- ISO 4217 code
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Decision Tree

```
Need to store money?        → Use INTEGER (minor units)
Need to display money?      → Use formatMoney()
Need to do calculations?    → Use money utility functions
Need currency conversion?   → Use convertMoney() with rate
User input in dollars?      → Use createMoney() to convert
```

---

## Code Examples

### Example 1: Creating a Transaction

```typescript
import { createMoney } from '@/lib/money';

async function createTransaction(amountInDollars: number, currency: string) {
  // Convert user input to minor units
  const money = createMoney(amountInDollars, currency);
  
  // Store in database
  await db.transactions.create({
    amount: money.amount,  // Integer (centavos)
    currency: money.currency,
    type: 'EXPENSE'
  });
}

// Usage
await createTransaction(25.50, 'USD'); // Stores 2550
```

### Example 2: Calculating Account Balance

```typescript
import { addMoney, subtractMoney, createMoney } from '@/lib/money';

async function calculateBalance(accountId: string) {
  const transactions = await db.transactions.findMany({
    where: { accountId }
  });
  
  let balance = createMoney(0, 'USD');
  
  for (const tx of transactions) {
    const txMoney = { amount: tx.amount, currency: tx.currency };
    
    if (tx.type === 'INCOME') {
      balance = addMoney(balance, txMoney);
    } else if (tx.type === 'EXPENSE') {
      balance = subtractMoney(balance, txMoney);
    }
  }
  
  return balance;
}
```

### Example 3: Multi-Currency Display

```typescript
import { formatMoney, convertMoney } from '@/lib/money';

function displayMultiCurrency(amount: number, currency: string, rates: Record<string, number>) {
  const money = { amount, currency };
  
  return {
    original: formatMoney(money),
    usd: currency === 'USD' 
      ? formatMoney(money) 
      : formatMoney(convertMoney(money, 'USD', rates.USD)),
    ves: currency === 'VES'
      ? formatMoney(money)
      : formatMoney(convertMoney(money, 'VES', rates.VES))
  };
}
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Use Floating Point

```typescript
// WRONG - Precision errors
let balance = 0.1 + 0.2; // 0.30000000000000004
```

### ❌ DON'T: Store Decimals in Database

```sql
-- WRONG
CREATE TABLE transactions (
  amount DECIMAL(10, 2)  -- NO!
);
```

### ❌ DON'T: Manual Conversion

```typescript
// WRONG - Error prone
const cents = Math.round(dollars * 100); // Can have rounding errors
```

### ✅ DO: Use Utility Functions

```typescript
// CORRECT
import { createMoney } from '@/lib/money';
const money = createMoney(dollars, currency);
```

---

## Testing Money Operations

```typescript
import { createMoney, addMoney, formatMoney } from '@/lib/money';

describe('Money Operations', () => {
  it('should handle precision correctly', () => {
    const a = createMoney(0.1, 'USD');
    const b = createMoney(0.2, 'USD');
    const sum = addMoney(a, b);
    
    expect(sum.amount).toBe(30); // 30 centavos
    expect(formatMoney(sum)).toBe('$0.30');
  });
  
  it('should prevent floating point errors', () => {
    const money = createMoney(10.50, 'USD');
    expect(money.amount).toBe(1050);
  });
});
```

---

## Commands

```bash
# Type check money operations
npm run type-check

# Run money utility tests
npm test -- lib/money.test.ts

# Check for floating point usage (code review)
grep -r "amount.*:" --include="*.ts" | grep -v "number.*//.*minor"
```

---

## Resources

- **Core Library**: See [lib/money.ts](file:///c:/Users/ismar/Documents/projects/fintec/lib/money.ts)
- **Domain Types**: See [types/domain.ts](file:///c:/Users/ismar/Documents/projects/fintec/types/domain.ts)
- **GEMINI.md**: See [GEMINI.md](file:///c:/Users/ismar/Documents/projects/fintec/GEMINI.md) - Rule #1

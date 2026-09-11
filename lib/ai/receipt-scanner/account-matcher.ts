import type {
  AccountCandidate,
  AccountMatchConfidence,
  ScannedReceiptResult,
  ScannedReceiptType,
} from './types';

interface BankAliasRule {
  bankKey: string;
  keywords: string[];
}

const BANK_ALIAS_RULES: BankAliasRule[] = [
  {
    bankKey: 'banesco',
    keywords: ['banesco', 'banco banesco', 'banesco banco universal'],
  },
  { bankKey: 'bdv', keywords: ['bdv', 'venezuela', 'banco de venezuela'] },
  { bankKey: 'mercantil', keywords: ['mercantil', 'banco mercantil'] },
  {
    bankKey: 'provincial',
    keywords: ['provincial', 'bbva', 'bbva provincial'],
  },
  {
    bankKey: 'bnc',
    keywords: ['bnc', 'nacional de credito', 'banco nacional de credito'],
  },
  {
    bankKey: 'bancaribe',
    keywords: ['bancaribe', 'caribe', 'banco del caribe'],
  },
  {
    bankKey: 'bancamiga',
    keywords: ['bancamiga', 'banco universal bancamiga'],
  },
  { bankKey: 'banplus', keywords: ['banplus', 'banplus banco universal'] },
  { bankKey: 'plaza', keywords: ['plaza', 'banco plaza'] },
  { bankKey: 'tesoro', keywords: ['tesoro', 'banco del tesoro'] },
  { bankKey: 'bicentenario', keywords: ['bicentenario', 'banco bicentenario'] },
  { bankKey: '100banco', keywords: ['100% banco', '100%banco', '100 banco'] },
  {
    bankKey: 'binance',
    keywords: ['binance', 'usdt', 'crypto', 'cripto', 'p2p'],
  },
  { bankKey: 'zinli', keywords: ['zinli'] },
  { bankKey: 'wally', keywords: ['wally', 'wallytech'] },
  { bankKey: 'zelle', keywords: ['zelle'] },
  { bankKey: 'paypal', keywords: ['paypal'] },
  { bankKey: 'cash', keywords: ['efectivo', 'cash'] },
];

function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeCurrency(currency?: string): string {
  if (!currency) return 'USD';
  const c = currency.toUpperCase().trim();
  if (c === 'BS' || c === 'BS.' || c === 'BOLIVARES' || c === 'BOLÍVARES')
    return 'VES';
  if (c === 'USDT' || c === 'USD$' || c === 'DOLARES' || c === 'DÓLARES')
    return 'USD';
  return c;
}

/**
 * Identify known bank or platform from arbitrary text (bank name, notes, description).
 */
export function detectBankKey(text?: string): string | null {
  const norm = normalizeText(text);
  if (!norm) return null;

  for (const rule of BANK_ALIAS_RULES) {
    if (rule.keywords.some((kw) => norm.includes(kw))) {
      return rule.bankKey;
    }
  }
  return null;
}

/**
 * Score how well an account matches a bank key or raw detected platform name.
 */
function scoreAccountMatch(
  account: AccountCandidate,
  detectedBankKey: string | null,
  rawBankOrPlatform?: string,
  rawAccountNumber?: string
): number {
  let score = 0;
  const accountNameNorm = normalizeText(account.name);
  const accountBankNorm = normalizeText(account.bankName);
  const rawPlatformNorm = normalizeText(rawBankOrPlatform);

  if (detectedBankKey) {
    const rule = BANK_ALIAS_RULES.find((r) => r.bankKey === detectedBankKey);
    if (rule) {
      const matchesAccountName = rule.keywords.some((kw) =>
        accountNameNorm.includes(kw)
      );
      const matchesAccountBank = rule.keywords.some((kw) =>
        accountBankNorm.includes(kw)
      );
      if (matchesAccountName || matchesAccountBank) {
        score += 20;
      }
    }
  }

  if (
    rawPlatformNorm &&
    (accountNameNorm.includes(rawPlatformNorm) ||
      accountBankNorm.includes(rawPlatformNorm))
  ) {
    score += 15;
  }

  // Check last digits if available
  if (rawAccountNumber && rawAccountNumber.length >= 4) {
    const last4 = rawAccountNumber.slice(-4);
    if (accountNameNorm.includes(last4)) {
      score += 30;
    }
  }

  return score;
}

export interface MatchResult {
  suggestedAccountId?: string;
  suggestedToAccountId?: string;
  confidence: AccountMatchConfidence;
  reason: string;
  candidateIds: string[];
}

/**
 * Matches accounts for standard transactions (EXPENSE / INCOME) and transfers (TRANSFER).
 */
export function matchReceiptAccounts(
  receipt: {
    type: ScannedReceiptType;
    currency: string;
    targetCurrency?: string;
    bankOrPlatform?: string;
    paymentMethod?: string;
    counterparty?: { bank?: string; accountNumber?: string };
  },
  accounts: AccountCandidate[]
): MatchResult {
  if (!accounts || accounts.length === 0) {
    return {
      confidence: 'NONE',
      reason: 'No hay carteras registradas.',
      candidateIds: [],
    };
  }

  const primaryCur = normalizeCurrency(receipt.currency);
  const detectedBank = detectBankKey(
    `${receipt.bankOrPlatform || ''} ${receipt.paymentMethod || ''}`
  );

  // If TRANSFER: Find source account (from) and target account (to)
  if (receipt.type === 'TRANSFER') {
    const targetCur = receipt.targetCurrency
      ? normalizeCurrency(receipt.targetCurrency)
      : primaryCur;

    // Find candidate accounts for source currency
    const fromCandidates = accounts.filter(
      (a) => normalizeCurrency(a.currencyCode) === primaryCur
    );
    // Find candidate accounts for target currency
    const toCandidates = accounts.filter(
      (a) => normalizeCurrency(a.currencyCode) === targetCur
    );

    let suggestedFromId: string | undefined;
    let suggestedToId: string | undefined;

    // Pick best from
    if (fromCandidates.length === 1) {
      suggestedFromId = fromCandidates[0].id;
    } else if (fromCandidates.length > 1) {
      // Prioritize platform or crypto/binance if source is USD/USDT
      const bestFrom = fromCandidates
        .map((acc) => ({
          acc,
          score: scoreAccountMatch(acc, detectedBank, receipt.bankOrPlatform),
        }))
        .sort((a, b) => b.score - a.score);
      suggestedFromId =
        bestFrom[0]?.score > 0 ? bestFrom[0].acc.id : fromCandidates[0].id;
    }

    // Pick best to
    if (toCandidates.length === 1) {
      suggestedToId = toCandidates[0].id;
    } else if (toCandidates.length > 1) {
      const destBank = detectBankKey(
        receipt.counterparty?.bank || receipt.bankOrPlatform
      );
      const bestTo = toCandidates
        .map((acc) => ({
          acc,
          score: scoreAccountMatch(acc, destBank, receipt.counterparty?.bank),
        }))
        .sort((a, b) => b.score - a.score);
      suggestedToId =
        bestTo[0]?.score > 0 ? bestTo[0].acc.id : toCandidates[0].id;
    }

    // Invariant check: from and to must not reference the identical account
    if (suggestedFromId && suggestedToId && suggestedFromId === suggestedToId) {
      const alternateTo = toCandidates.find((a) => a.id !== suggestedFromId);
      if (alternateTo) {
        suggestedToId = alternateTo.id;
      } else {
        suggestedToId = undefined;
      }
    }

    const confidence: AccountMatchConfidence =
      suggestedFromId && suggestedToId
        ? 'HIGH'
        : suggestedFromId || suggestedToId
          ? 'MEDIUM'
          : 'NONE';

    const reason =
      suggestedFromId && suggestedToId
        ? primaryCur === targetCur
          ? `Transferencia entre cuentas en ${primaryCur}.`
          : `Transferencia detectada de ${primaryCur} a ${targetCur}.`
        : primaryCur === targetCur
          ? `Transferencia en ${primaryCur}. Selecciona la cuenta de destino.`
          : `Transferencia detectada de ${primaryCur} a ${targetCur}.`;

    return {
      suggestedAccountId: suggestedFromId,
      suggestedToAccountId: suggestedToId,
      confidence,
      reason,
      candidateIds: [
        ...fromCandidates.map((a) => a.id),
        ...toCandidates.map((a) => a.id),
      ],
    };
  }

  // Standard EXPENSE or INCOME
  const currencyMatches = accounts.filter(
    (a) => normalizeCurrency(a.currencyCode) === primaryCur
  );

  // Case 1: No account in this currency
  if (currencyMatches.length === 0) {
    return {
      confidence: 'NONE',
      reason: `No tienes carteras registradas en moneda ${primaryCur}.`,
      candidateIds: [],
    };
  }

  // Case 2: Exactly ONE account in this currency -> Auto-select 100%
  if (currencyMatches.length === 1) {
    const singleAccount = currencyMatches[0];
    return {
      suggestedAccountId: singleAccount.id,
      confidence: 'HIGH',
      reason: `Auto-seleccionada: única cartera en ${primaryCur} ("${singleAccount.name}").`,
      candidateIds: [singleAccount.id],
    };
  }

  // Case 3: Multiple accounts in this currency (e.g. 2 VES bank accounts)
  // Check if bank/platform match distinguishes them
  const scored = currencyMatches.map((acc) => ({
    account: acc,
    score: scoreAccountMatch(
      acc,
      detectedBank,
      receipt.bankOrPlatform,
      receipt.counterparty?.accountNumber
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runnerUp = scored[1];

  if (top.score > 0 && (!runnerUp || top.score > runnerUp.score)) {
    // Clear winner by bank name/digits!
    return {
      suggestedAccountId: top.account.id,
      confidence: 'HIGH',
      reason: `Identificada por coincidencia bancaria con ${receipt.bankOrPlatform || detectedBank || 'el recibo'} ("${top.account.name}").`,
      candidateIds: currencyMatches.map((a) => a.id),
    };
  }

  // Ambiguous: User has multiple accounts in this currency and receipt does not differentiate
  const namesList = currencyMatches.map((a) => a.name).join(', ');
  return {
    suggestedAccountId: top.account.id, // default to top or first, but mark ambiguous
    confidence: 'AMBIGUOUS',
    reason: `Detectamos ${primaryCur}, pero tienes ${currencyMatches.length} carteras (${namesList}). Por favor confirma cuál utilizaste.`,
    candidateIds: currencyMatches.map((a) => a.id),
  };
}

/**
 * Agent v2 evaluation runner.
 *
 *   npx tsx evals/agent-v2/run.ts                 # deterministic, no network
 *   npx tsx --env-file=.env.local evals/agent-v2/run.ts --live [--limit=50] [--intent=create_transfer] [--concurrency=4] [--rpm=7]
 *
 * `--rpm=N` spaces case starts so at most N cases begin per minute. A case makes
 * up to two model calls, so the free tier (15 requests/minute) needs about 7.
 * Without it, cases start as fast as the workers free up.
 *
 * Deterministic mode validates the dataset and scores the keyword resolver
 * layer alone (no model hint). Live mode drives the real model with the chat
 * system prompt and tool definitions whose execute only records the call.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveCategory } from '@/lib/ai/resolution/entity-resolver';
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_CATEGORIES,
  FIXTURE_USER_ID,
  accountCurrency,
  categoryKind,
} from './fixture';
import {
  AGENT_INTENTS,
  EXPECTED_TOOL,
  type AgentEvalCase,
  type AgentIntent,
} from './types';

const DATASET = path.join(__dirname, 'dataset', 'cases.json');
const REPORTS = path.join(__dirname, 'reports');

export function loadCases(): AgentEvalCase[] {
  try {
    return JSON.parse(fs.readFileSync(DATASET, 'utf8')) as AgentEvalCase[];
  } catch (error) {
    throw new Error(
      `Cannot read ${DATASET}; run evals/agent-v2/generate-dataset.ts first (${error instanceof Error ? error.message : String(error)})`
    );
  }
}

/** Returns one message per integrity violation; empty means the dataset is valid. */
export function validateDataset(cases: AgentEvalCase[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const accounts = new Set(FIXTURE_ACCOUNTS.map((a) => a.name));
  for (const c of cases) {
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`);
    ids.add(c.id);
    if (!AGENT_INTENTS.includes(c.intent))
      errors.push(`${c.id}: unknown intent ${c.intent}`);
    if (!c.utterance.trim()) errors.push(`${c.id}: empty utterance`);
    const e = c.expected;
    if (e.category) {
      const kind = categoryKind(e.category);
      if (!kind) errors.push(`${c.id}: unknown category ${e.category}`);
      else if (e.type && kind !== e.type)
        errors.push(
          `${c.id}: category ${e.category} is ${kind}, case is ${e.type}`
        );
    }
    for (const name of [e.account, e.toAccount]) {
      if (name && !accounts.has(name))
        errors.push(`${c.id}: unknown account ${name}`);
    }
    if (c.intent === 'create_expense' || c.intent === 'create_income') {
      if (!e.category || e.amount === undefined)
        errors.push(`${c.id}: missing category or amount`);
      if (e.type !== (c.intent === 'create_income' ? 'INCOME' : 'EXPENSE'))
        errors.push(`${c.id}: type does not match intent`);
      if (e.account && e.currency && accountCurrency(e.account) !== e.currency)
        errors.push(`${c.id}: account currency mismatch`);
    }
    if (c.intent === 'create_transfer') {
      if (!e.account || !e.toAccount || e.account === e.toAccount)
        errors.push(`${c.id}: transfer needs two distinct accounts`);
      if (!e.amount) errors.push(`${c.id}: transfer needs an amount`);
    }
    if (c.intent === 'deferred_expenses' && !(e.count && e.count >= 2))
      errors.push(`${c.id}: deferred needs count >= 2`);
  }
  return errors;
}

interface Tally {
  total: number;
  correct: number;
}

const bump = (map: Record<string, Tally>, key: string, ok: boolean) => {
  map[key] ??= { total: 0, correct: 0 };
  map[key].total += 1;
  if (ok) map[key].correct += 1;
};

export interface DeterministicReport {
  mode: 'deterministic';
  totalCases: number;
  byIntent: Record<string, number>;
  integrityErrors: string[];
  resolver: {
    scored: number;
    correct: number;
    askedInsteadOfGuessing: number;
    /** Silent wrong categories; must stay 0 (asking beats misfiling money). */
    wrongGuesses: number;
    byCategory: Record<string, Tally>;
    failures: Array<{
      id: string;
      utterance: string;
      expected: string;
      got: string;
    }>;
  };
}

export function runDeterministic(cases: AgentEvalCase[]): DeterministicReport {
  const byIntent: Record<string, number> = {};
  for (const c of cases) byIntent[c.intent] = (byIntent[c.intent] ?? 0) + 1;

  const byCategory: Record<string, Tally> = {};
  const failures: DeterministicReport['resolver']['failures'] = [];
  let scored = 0;
  let correct = 0;
  let asked = 0;
  for (const c of cases) {
    if (
      (c.intent !== 'create_expense' && c.intent !== 'create_income') ||
      !c.expected.category
    )
      continue;
    scored += 1;
    const result = resolveCategory({
      categories: FIXTURE_CATEGORIES,
      userId: FIXTURE_USER_ID,
      kind: c.expected.type ?? 'EXPENSE',
      description: c.utterance,
    });
    const got = result.status === 'resolved' ? result.value.name : '(asks)';
    if (result.status !== 'resolved') asked += 1;
    const ok = got === c.expected.category;
    if (ok) correct += 1;
    else
      failures.push({
        id: c.id,
        utterance: c.utterance,
        expected: c.expected.category,
        got,
      });
    bump(byCategory, c.expected.category, ok);
  }

  return {
    mode: 'deterministic',
    totalCases: cases.length,
    byIntent,
    integrityErrors: validateDataset(cases),
    resolver: {
      scored,
      correct,
      askedInsteadOfGuessing: asked,
      wrongGuesses: scored - correct - asked,
      byCategory,
      failures,
    },
  };
}

const pct = (t: Tally) =>
  t.total ? `${((100 * t.correct) / t.total).toFixed(1)}%` : 'n/a';

function deterministicMarkdown(r: DeterministicReport): string {
  const lines = [
    '# Agent v2 eval — deterministic',
    '',
    `Cases: ${r.totalCases}. Integrity errors: ${r.integrityErrors.length}.`,
    '',
    '| Intent | Cases |',
    '| --- | --- |',
    ...Object.entries(r.byIntent).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    `Fallback resolver without a model hint: correct ${r.resolver.correct}, asked ${r.resolver.askedInsteadOfGuessing}, wrong ${r.resolver.wrongGuesses} of ${r.resolver.scored}.`,
    '',
    '| Category | Accuracy | Cases |',
    '| --- | --- | --- |',
    ...Object.entries(r.resolver.byCategory).map(
      ([k, t]) => `| ${k} | ${pct(t)} | ${t.total} |`
    ),
  ];
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- live mode

interface RecordedCall {
  toolName: string;
  args: Record<string, unknown>;
}

interface LiveResult {
  id: string;
  intent: AgentIntent;
  utterance: string;
  calls: RecordedCall[];
  checks: Record<string, boolean>;
  passed?: boolean;
  unmeasured?: boolean;
  error?: string;
}

export function isQuotaError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as {
      status?: unknown;
      statusCode?: unknown;
      message?: unknown;
    };
    if (e.status === 429 || e.statusCode === 429) return true;
    if (typeof e.message === 'string' && /quota/i.test(e.message)) return true;
  }
  return typeof error === 'string' && /quota/i.test(error);
}

const norm = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export function scoreLiveCase(
  c: AgentEvalCase,
  calls: RecordedCall[]
): Pick<LiveResult, 'checks' | 'passed'> {
  const expectedTool = EXPECTED_TOOL[c.intent];
  const writeTools = [
    'createTransaction',
    'createTransfer',
    'createPendingExpenses',
    'createGoal',
  ];
  const checks: Record<string, boolean> = {};
  if (expectedTool === null) {
    checks.noWrite = !calls.some((call) => writeTools.includes(call.toolName));
    return { checks, passed: checks.noWrite };
  }
  const call = calls.find((x) => x.toolName === expectedTool);
  checks.tool = Boolean(call);
  // A transfer recorded as an expense is the bug from L2: count it explicitly.
  if (c.intent === 'create_transfer') {
    checks.notRecordedAsExpense = !calls.some(
      (x) => x.toolName === 'createTransaction'
    );
  }
  const e = c.expected;
  const a = call?.args ?? {};
  const categoryName = (id: unknown) =>
    FIXTURE_CATEGORIES.find((cat) => cat.id === id)?.name;
  if (
    call &&
    c.intent.startsWith('create_') &&
    c.intent !== 'create_transfer'
  ) {
    if (e.type) checks.type = a.type === e.type;
    if (e.category)
      checks.category =
        norm(categoryName(a.categoryId) ?? a.category) === norm(e.category);
    if (e.amount !== undefined) checks.amount = Number(a.amount) === e.amount;
    if (e.account) checks.account = norm(a.accountName) === norm(e.account);
  }
  if (call && c.intent === 'create_transfer') {
    checks.from = norm(a.fromAccountName) === norm(e.account);
    checks.to = norm(a.toAccountName) === norm(e.toAccount);
    if (e.amount !== undefined) checks.amount = Number(a.amount) === e.amount;
  }
  if (call && c.intent === 'deferred_expenses' && e.count) {
    checks.count = Number(a.count) === e.count;
  }
  if (call && c.intent === 'query' && e.category) {
    checks.category = norm(a.category) === norm(e.category);
  }
  return { checks, passed: Object.values(checks).every(Boolean) };
}

/**
 * Spaces case starts to at most `rpm` per minute. Every worker awaits its own
 * turn, so the model never sees a burst that would trip a per-minute quota.
 */
function createPacer(rpm: number): () => Promise<void> {
  if (rpm <= 0) return async () => {};
  const intervalMs = 60_000 / rpm;
  let nextStart = 0;
  return async () => {
    const now = Date.now();
    const start = Math.max(now, nextStart);
    nextStart = start + intervalMs;
    if (start > now) await new Promise((r) => setTimeout(r, start - now));
  };
}

async function runLive(
  cases: AgentEvalCase[],
  concurrency: number,
  rpm = 0
): Promise<LiveResult[]> {
  const { generateText, stepCountIs, tool } = await import('ai');
  const { z } = await import('zod');
  const { buildSystemPrompt, getAIModel } = await import('@/lib/ai/config');
  const schemas = await import('@/lib/ai/tools/schemas');

  // Tools the agent should have per EXPECTED_TOOL; the ones not built yet are
  // declared here with their target contract so the gap shows as failures.
  const definitions: Record<string, { description: string; inputSchema: any }> =
    {
      createTransaction: {
        description: 'Create a new financial transaction (expense or income).',
        inputSchema: schemas.createTransactionSchema,
      },
      queryTransactions: {
        description: 'Filter and aggregate transactions.',
        inputSchema: schemas.queryTransactionsSchema,
      },
      searchTransactions: {
        description: 'Fuzzy search over past transactions.',
        inputSchema: schemas.searchTransactionsSchema,
      },
      getAccountBalance: {
        description: 'Check the balance of specific or all accounts.',
        inputSchema: schemas.getAccountBalanceSchema,
      },
      createGoal: {
        description: 'Create a new financial goal.',
        inputSchema: schemas.createGoalSchema,
      },
    };
  const extra = schemas as Record<string, unknown>;
  if (extra.createTransferSchema) {
    definitions.createTransfer = {
      description:
        "Move money between two of the user's own accounts. Never use createTransaction for this.",
      inputSchema: extra.createTransferSchema,
    };
  }
  if (extra.createPendingExpensesSchema) {
    definitions.createPendingExpenses = {
      description:
        'Register N expenses without amounts; receipts are attached later.',
      inputSchema: extra.createPendingExpensesSchema,
    };
  }
  void z;

  const system = buildSystemPrompt({
    userId: FIXTURE_USER_ID,
    accounts: FIXTURE_ACCOUNTS.map((a) => ({
      name: a.name,
      currencyCode: a.currencyCode,
    })),
    categories: FIXTURE_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as 'INCOME' | 'EXPENSE',
    })),
  });

  const results: LiveResult[] = [];
  const pace = createPacer(rpm);
  let cursor = 0;
  let consecutiveQuotaErrors = 0;
  let quotaExhausted = false;
  const worker = async () => {
    while (cursor < cases.length && !quotaExhausted) {
      const c = cases[cursor++];
      await pace();
      const calls: RecordedCall[] = [];
      const tools = Object.fromEntries(
        Object.entries(definitions).map(([name, d]) => [
          name,
          tool({
            description: d.description,
            inputSchema: d.inputSchema,
            execute: async (args: Record<string, unknown>) => {
              calls.push({ toolName: name, args });
              return { status: 'recorded' };
            },
          }),
        ])
      );
      try {
        await generateText({
          model: getAIModel(),
          system,
          prompt: c.utterance,
          tools,
          stopWhen: stepCountIs(2),
          temperature: 0,
        });
        consecutiveQuotaErrors = 0;
        results.push({
          id: c.id,
          intent: c.intent,
          utterance: c.utterance,
          calls,
          ...scoreLiveCase(c, calls),
        });
      } catch (error) {
        const quota = isQuotaError(error);
        consecutiveQuotaErrors = quota ? consecutiveQuotaErrors + 1 : 0;
        if (consecutiveQuotaErrors >= 5 && !quotaExhausted) {
          quotaExhausted = true;
          console.log('Run stopped because the provider quota is exhausted.');
        }
        results.push({
          id: c.id,
          intent: c.intent,
          utterance: c.utterance,
          calls,
          checks: {},
          ...(quota ? { unmeasured: true } : { passed: false }),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  for (const c of cases.slice(cursor)) {
    results.push({
      id: c.id,
      intent: c.intent,
      utterance: c.utterance,
      calls: [],
      checks: {},
      unmeasured: true,
    });
  }
  return results;
}

export function liveMarkdown(results: LiveResult[]): string {
  const byIntent: Record<string, Tally> = {};
  const byCheck: Record<string, Tally> = {};
  const measured = results.filter((r) => !r.unmeasured);
  const unmeasured = results.length - measured.length;
  for (const r of measured) {
    bump(byIntent, r.intent, Boolean(r.passed));
    for (const [k, v] of Object.entries(r.checks)) bump(byCheck, k, v);
  }
  const failures = measured.filter((r) => !r.passed);
  const passed = measured.length - failures.length;
  return [
    '# Agent v2 eval — live',
    '',
    `Cases: ${results.length}. Measured: ${measured.length}. Passed: ${passed}. Unmeasured: ${unmeasured}. Pass rate: ${pct({ total: measured.length, correct: passed })}.`,
    '',
    '| Intent | Pass rate | Cases |',
    '| --- | --- | --- |',
    ...Object.entries(byIntent).map(
      ([k, t]) => `| ${k} | ${pct(t)} | ${t.total} |`
    ),
    '',
    '| Check | Pass rate | Cases |',
    '| --- | --- | --- |',
    ...Object.entries(byCheck).map(
      ([k, t]) => `| ${k} | ${pct(t)} | ${t.total} |`
    ),
    '',
    '## Failures',
    '',
    `${unmeasured} cases were not measured.`,
    '',
    ...failures.map((r) => {
      const calls = r.calls
        .map((c) => `${c.toolName}(${JSON.stringify(c.args)})`)
        .join(', ');
      return `- ${r.id} [${r.intent}] "${r.utterance}" → ${r.error ?? (calls || 'no tool call')}`;
    }),
    '',
  ].join('\n');
}

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

async function main() {
  let cases = loadCases();
  fs.mkdirSync(REPORTS, { recursive: true });

  if (!process.argv.includes('--live')) {
    const report = runDeterministic(cases);
    fs.writeFileSync(
      path.join(REPORTS, 'deterministic.json'),
      JSON.stringify(report, null, 2)
    );
    fs.writeFileSync(
      path.join(REPORTS, 'deterministic.md'),
      deterministicMarkdown(report)
    );
    process.stdout.write(deterministicMarkdown(report));
    process.exitCode = report.integrityErrors.length > 0 ? 1 : 0;
    return;
  }

  const hasKey = [
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'AI_GATEWAY_API_KEY',
  ].some((k) => process.env[k]);
  if (!hasKey) {
    console.log(
      'live mode skipped: no AI provider key in the environment (use --env-file=.env.local)'
    );
    return;
  }
  const intent = arg('intent');
  if (intent) cases = cases.filter((c) => c.intent === intent);
  const limit = Number(arg('limit') ?? 0);
  if (limit > 0) cases = cases.slice(0, limit);
  const results = await runLive(
    cases,
    Number(arg('concurrency') ?? 4),
    Number(arg('rpm') ?? 0)
  );
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(REPORTS, `live-${stamp}.json`),
    JSON.stringify(results, null, 2)
  );
  const md = liveMarkdown(results);
  fs.writeFileSync(path.join(REPORTS, `live-${stamp}.md`), md);
  process.stdout.write(md);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

import {
  loadCases,
  runDeterministic,
  scoreLiveCase,
  validateDataset,
} from '@/evals/agent-v2/run';
import { AGENT_INTENTS, type AgentEvalCase } from '@/evals/agent-v2/types';

describe('agent v2 evaluation dataset (#116)', () => {
  const cases = loadCases();

  it('has at least 400 valid cases covering every intent, including hand-written hard cases', () => {
    expect(validateDataset(cases)).toEqual([]);
    expect(cases.length).toBeGreaterThanOrEqual(400);
    for (const intent of AGENT_INTENTS) {
      expect(cases.some((c) => c.intent === intent)).toBe(true);
    }
    expect(cases.filter((c) => c.hard).length).toBeGreaterThanOrEqual(80);
  });

  it('rejects labels that reference unknown categories or mismatched kinds', () => {
    const broken: AgentEvalCase[] = [
      {
        id: 'x1',
        utterance: 'gasté 5 en algo',
        intent: 'create_expense',
        hard: true,
        expected: { type: 'EXPENSE', category: 'Inexistente', amount: 5 },
      },
      {
        id: 'x2',
        utterance: 'cobré 5',
        intent: 'create_income',
        hard: true,
        expected: { type: 'INCOME', category: 'Carros', amount: 5 },
      },
    ];
    expect(validateDataset(broken)).toEqual([
      'x1: unknown category Inexistente',
      'x2: category Carros is EXPENSE, case is INCOME',
    ]);
  });

  it('reports resolver accuracy per category in deterministic mode', () => {
    const report = runDeterministic(cases);
    expect(report.integrityErrors).toEqual([]);
    expect(report.totalCases).toBe(cases.length);
    expect(report.resolver.scored).toBe(
      cases.filter(
        (c) => c.intent === 'create_expense' || c.intent === 'create_income'
      ).length
    );
    expect(Object.keys(report.resolver.byCategory)).toContain('Carros');
    // Without the model's category the resolver asks; it never misfiles money.
    expect(report.resolver.wrongGuesses).toBe(0);
  });

  it('fails a transfer that the agent recorded as an expense', () => {
    const transfer = cases.find((c) => c.intent === 'create_transfer')!;
    const asExpense = scoreLiveCase(transfer, [
      {
        toolName: 'createTransaction',
        args: { type: 'EXPENSE', amount: transfer.expected.amount },
      },
    ]);
    expect(asExpense.passed).toBe(false);
    expect(asExpense.checks).toMatchObject({
      tool: false,
      notRecordedAsExpense: false,
    });

    const asTransfer = scoreLiveCase(transfer, [
      {
        toolName: 'createTransfer',
        args: {
          fromAccountName: transfer.expected.account,
          toAccountName: transfer.expected.toAccount,
          amount: transfer.expected.amount,
        },
      },
    ]);
    expect(asTransfer.passed).toBe(true);
  });
});

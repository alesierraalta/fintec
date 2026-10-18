import {
  MAX_HISTORY_HINTS,
  buildPrompt,
} from '@/lib/ai/voice-capture/capture-service';

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const base = {
  today: '2026-10-17',
  imageCount: 1,
  hasAudio: false,
  accounts: [{ id: 'bn', name: 'Binance', currencyCode: 'USDT' }],
  categories: [{ id: 'salud', name: 'Salud', kind: 'EXPENSE' as const }],
};

describe('buildPrompt history hints', () => {
  it('omits the history section when there is no history', () => {
    expect(buildPrompt(base)).not.toMatch(/past transactions/i);
  });

  it('lists distinct description/category pairs once', () => {
    const prompt = buildPrompt({
      ...base,
      history: [
        { description: 'Farmacia SAAS', category: 'Salud' },
        { description: 'Farmacia SAAS', category: 'Salud' },
        { description: 'Locatel', category: 'Salud' },
      ],
    });
    expect(prompt).toMatch(/past transactions/i);
    expect(prompt.match(/Farmacia SAAS/g)).toHaveLength(1);
    expect(prompt).toContain('"Locatel" -> Salud');
  });

  it(`keeps at most ${MAX_HISTORY_HINTS} hints`, () => {
    const history = Array.from({ length: MAX_HISTORY_HINTS + 50 }, (_, i) => ({
      description: `Comercio ${i}`,
      category: 'Salud',
    }));
    const prompt = buildPrompt({ ...base, history });
    expect(prompt.match(/" -> Salud/g)).toHaveLength(MAX_HISTORY_HINTS);
  });
});

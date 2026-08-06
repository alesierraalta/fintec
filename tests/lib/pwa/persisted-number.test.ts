import {
  readPersistedNumber,
  writePersistedNumber,
} from '@/lib/pwa/persisted-number';

const KEY = 'fintec.test.persisted-number';

describe('persisted-number', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing was recorded', () => {
    expect(readPersistedNumber(KEY)).toBeNull();
  });

  it('round-trips a written value', () => {
    writePersistedNumber(KEY, 42);
    expect(readPersistedNumber(KEY)).toBe(42);
  });

  it('treats a corrupt persisted value as null and does not throw', () => {
    window.localStorage.setItem(KEY, 'not-a-number');

    expect(() => expect(readPersistedNumber(KEY)).toBeNull()).not.toThrow();
  });

  it('write does not throw when localStorage.setItem throws', () => {
    const setItemSpy = jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    expect(() => writePersistedNumber(KEY, 1)).not.toThrow();

    setItemSpy.mockRestore();
  });
});

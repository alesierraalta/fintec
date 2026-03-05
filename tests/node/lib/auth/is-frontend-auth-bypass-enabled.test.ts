import { isFrontendAuthBypassEnabled } from '@/lib/auth/is-frontend-auth-bypass-enabled';

describe('isFrontendAuthBypassEnabled', () => {
  it('enables bypass only for accepted truthy values in non-production', () => {
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'development', bypassFlag: '1' })
    ).toBe(true);
    expect(
      isFrontendAuthBypassEnabled({
        nodeEnv: 'development',
        bypassFlag: 'true',
      })
    ).toBe(true);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'test', bypassFlag: 'yes' })
    ).toBe(true);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'test', bypassFlag: ' YES ' })
    ).toBe(true);
  });

  it('keeps bypass disabled for falsy and malformed values', () => {
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'development', bypassFlag: '' })
    ).toBe(false);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'development', bypassFlag: '0' })
    ).toBe(false);
    expect(
      isFrontendAuthBypassEnabled({
        nodeEnv: 'development',
        bypassFlag: 'false',
      })
    ).toBe(false);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'development', bypassFlag: 'on' })
    ).toBe(false);
  });

  it('hard-blocks bypass in production even when flag is truthy', () => {
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'production', bypassFlag: '1' })
    ).toBe(false);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'production', bypassFlag: 'true' })
    ).toBe(false);
    expect(
      isFrontendAuthBypassEnabled({ nodeEnv: 'production', bypassFlag: 'yes' })
    ).toBe(false);
  });
});

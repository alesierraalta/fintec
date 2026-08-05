import { resolveCapacitorServerTarget } from '@/lib/mobile/server-target';

const DEPLOYED = 'https://fintec.vercel.app';
const EMULATOR = 'http://10.0.2.2:3000';

describe('resolveCapacitorServerTarget precedence', () => {
  it('prefers CAP_SERVER_URL over NEXT_PUBLIC_APP_URL', () => {
    expect(
      resolveCapacitorServerTarget({
        CAP_SERVER_URL: EMULATOR,
        NEXT_PUBLIC_APP_URL: DEPLOYED,
      })
    ).toEqual({ url: EMULATOR, cleartext: true });
  });

  it('falls back to NEXT_PUBLIC_APP_URL when CAP_SERVER_URL is absent', () => {
    expect(
      resolveCapacitorServerTarget({ NEXT_PUBLIC_APP_URL: DEPLOYED })
    ).toEqual({ url: DEPLOYED, cleartext: false });
  });

  it('treats empty and whitespace-only values as absent', () => {
    expect(
      resolveCapacitorServerTarget({
        CAP_SERVER_URL: '   ',
        NEXT_PUBLIC_APP_URL: DEPLOYED,
      })
    ).toEqual({ url: DEPLOYED, cleartext: false });

    expect(
      resolveCapacitorServerTarget({
        CAP_SERVER_URL: '',
        NEXT_PUBLIC_APP_URL: DEPLOYED,
      })
    ).toEqual({ url: DEPLOYED, cleartext: false });
  });

  it('ignores undefined entries rather than resolving them', () => {
    expect(
      resolveCapacitorServerTarget({
        CAP_SERVER_URL: undefined,
        NEXT_PUBLIC_APP_URL: DEPLOYED,
      })
    ).toEqual({ url: DEPLOYED, cleartext: false });
  });
});

describe('resolveCapacitorServerTarget normalization', () => {
  it('strips a single trailing slash', () => {
    expect(
      resolveCapacitorServerTarget({ NEXT_PUBLIC_APP_URL: `${DEPLOYED}/` }).url
    ).toBe(DEPLOYED);
  });

  it('trims surrounding whitespace', () => {
    expect(
      resolveCapacitorServerTarget({ CAP_SERVER_URL: `  ${EMULATOR}  ` }).url
    ).toBe(EMULATOR);
  });

  it('preserves a path segment while stripping its trailing slash', () => {
    expect(
      resolveCapacitorServerTarget({ NEXT_PUBLIC_APP_URL: `${DEPLOYED}/app/` })
        .url
    ).toBe(`${DEPLOYED}/app`);
  });
});

describe('resolveCapacitorServerTarget cleartext derivation', () => {
  it('enables cleartext only for http origins', () => {
    expect(
      resolveCapacitorServerTarget({ CAP_SERVER_URL: EMULATOR }).cleartext
    ).toBe(true);
    expect(
      resolveCapacitorServerTarget({ CAP_SERVER_URL: 'http://192.168.1.42:3000' })
        .cleartext
    ).toBe(true);
  });

  it('disables cleartext for https origins', () => {
    expect(
      resolveCapacitorServerTarget({ CAP_SERVER_URL: DEPLOYED }).cleartext
    ).toBe(false);
  });
});

describe('resolveCapacitorServerTarget failure modes', () => {
  it('throws naming both variables when neither is configured', () => {
    expect(() => resolveCapacitorServerTarget({})).toThrow(/CAP_SERVER_URL/);
    expect(() => resolveCapacitorServerTarget({})).toThrow(
      /NEXT_PUBLIC_APP_URL/
    );
  });

  it('rejects a value that is not an absolute URL', () => {
    expect(() =>
      resolveCapacitorServerTarget({ CAP_SERVER_URL: 'not-a-url' })
    ).toThrow(/CAP_SERVER_URL/);
    expect(() =>
      resolveCapacitorServerTarget({ CAP_SERVER_URL: 'not-a-url' })
    ).toThrow(/not-a-url/);
  });

  it('rejects a host:port value missing its protocol', () => {
    expect(() =>
      resolveCapacitorServerTarget({ CAP_SERVER_URL: '10.0.2.2:3000' })
    ).toThrow(/CAP_SERVER_URL/);
  });

  it('rejects protocols other than http and https', () => {
    expect(() =>
      resolveCapacitorServerTarget({ CAP_SERVER_URL: 'ftp://example.com' })
    ).toThrow(/ftp/);
    expect(() =>
      resolveCapacitorServerTarget({ NEXT_PUBLIC_APP_URL: 'file:///tmp/app' })
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('names the variable that actually supplied the invalid value', () => {
    expect(() =>
      resolveCapacitorServerTarget({
        CAP_SERVER_URL: 'ftp://example.com',
        NEXT_PUBLIC_APP_URL: DEPLOYED,
      })
    ).toThrow(/CAP_SERVER_URL/);
  });
});

import {
  resolveInstallPlatform,
  resolvePromptKind,
  type InstallEnvironment,
} from '@/lib/pwa/install-platform';

const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.0.0 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
const IPADOS_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const DESKTOP_MAC_SAFARI_UA = IPADOS_SAFARI_UA;
const UNRECOGNISED_UA = 'SomeBot/1.0 (+https://example.com/bot)';

function baseEnv(
  overrides: Partial<InstallEnvironment> = {}
): InstallEnvironment {
  return {
    userAgent: DESKTOP_CHROME_UA,
    isStandalone: false,
    isNativeShell: false,
    maxTouchPoints: 0,
    ...overrides,
  };
}

describe('resolveInstallPlatform', () => {
  it('returns unsupported when running inside the Capacitor native shell, even when the user agent is Android and standalone is true', () => {
    const platform = resolveInstallPlatform(
      baseEnv({
        userAgent: ANDROID_CHROME_UA,
        isStandalone: true,
        isNativeShell: true,
      })
    );

    expect(platform).toBe('unsupported');
  });

  it('returns installed when the display mode is standalone', () => {
    const platform = resolveInstallPlatform(
      baseEnv({ userAgent: ANDROID_CHROME_UA, isStandalone: true })
    );

    expect(platform).toBe('installed');
  });

  it('returns ios for iOS Safari', () => {
    expect(resolveInstallPlatform(baseEnv({ userAgent: IOS_SAFARI_UA }))).toBe(
      'ios'
    );
  });

  it('returns ios for iOS Chrome (CriOS), since it still runs on WebKit', () => {
    expect(resolveInstallPlatform(baseEnv({ userAgent: IOS_CHROME_UA }))).toBe(
      'ios'
    );
  });

  it('returns android for Android Chrome', () => {
    expect(
      resolveInstallPlatform(baseEnv({ userAgent: ANDROID_CHROME_UA }))
    ).toBe('android');
  });

  it('returns desktop for desktop Chrome', () => {
    expect(
      resolveInstallPlatform(baseEnv({ userAgent: DESKTOP_CHROME_UA }))
    ).toBe('desktop');
  });

  it('returns unsupported for an unrecognised user agent with no install path', () => {
    expect(
      resolveInstallPlatform(baseEnv({ userAgent: UNRECOGNISED_UA }))
    ).toBe('unsupported');
  });

  describe('iPadOS 13+ (reports a desktop Macintosh user agent)', () => {
    it('returns ios when the Macintosh user agent is paired with more than one touch point', () => {
      expect(
        resolveInstallPlatform(
          baseEnv({ userAgent: IPADOS_SAFARI_UA, maxTouchPoints: 5 })
        )
      ).toBe('ios');
    });

    it('does not treat a real Mac (0 touch points) as iOS', () => {
      expect(
        resolveInstallPlatform(
          baseEnv({ userAgent: DESKTOP_MAC_SAFARI_UA, maxTouchPoints: 0 })
        )
      ).toBe('unsupported');
    });

    it('does not treat a Macintosh UA with exactly one touch point as iOS', () => {
      expect(
        resolveInstallPlatform(
          baseEnv({ userAgent: DESKTOP_MAC_SAFARI_UA, maxTouchPoints: 1 })
        )
      ).toBe('unsupported');
    });
  });
});

describe('resolvePromptKind', () => {
  it.each([
    ['android', 'native'],
    ['desktop', 'native'],
    ['ios', 'instructions'],
    ['installed', 'installed'],
    ['unsupported', 'none'],
  ] as const)('maps %s to %s', (platform, expected) => {
    expect(resolvePromptKind(platform)).toBe(expected);
  });
});

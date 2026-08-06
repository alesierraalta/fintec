import { isNativeShell, readInstallEnvironment } from '@/lib/pwa/environment';

let isNativePlatform = false;

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
  },
}));

describe('isNativeShell', () => {
  afterEach(() => {
    isNativePlatform = false;
  });

  it('reflects Capacitor.isNativePlatform()', () => {
    isNativePlatform = false;
    expect(isNativeShell()).toBe(false);

    isNativePlatform = true;
    expect(isNativeShell()).toBe(true);
  });
});

describe('readInstallEnvironment', () => {
  beforeEach(() => {
    isNativePlatform = false;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  it('reads userAgent, isNativeShell, and maxTouchPoints from the browser globals', () => {
    const env = readInstallEnvironment();

    expect(env.userAgent).toBe(navigator.userAgent);
    expect(env.isNativeShell).toBe(false);
    expect(typeof env.maxTouchPoints).toBe('number');
  });

  it('derives isStandalone from display-mode: standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    expect(readInstallEnvironment().isStandalone).toBe(true);
  });
});

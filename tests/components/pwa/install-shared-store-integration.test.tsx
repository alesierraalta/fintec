/**
 * C1 integration test — deliberately does NOT `jest.mock('@/hooks/use-pwa-install')`.
 *
 * Every other component test in this directory mocks the hook, which is
 * exactly how the C1 defect shipped green: both `InstallPrompt` and
 * `InstallAppSetting` can be mounted at once (the root layout mounts the
 * banner; the settings page mounts the settings entry), but a per-hook-
 * instance ref meant only whichever instance's effect ran first ever saw
 * the real `beforeinstallprompt` event. This test renders both together
 * with the REAL hook and the REAL shared store to prove the fix.
 */
import { render, screen, act } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { InstallAppSetting } from '@/components/pwa/install-app-setting';
import {
  PWA_INSTALL_EVENT_WINDOW_KEY,
  __resetInstallEventStoreForTests,
} from '@/lib/pwa/install-event-store';
import { __resetInstallEngagementForTests } from '@/lib/pwa/install-engagement';

const VISIT_COUNT_KEY = 'fintec.pwa-install.visit-count';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

let isNativePlatform = false;
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform },
}));

class FakeBeforeInstallPromptEvent extends Event {
  preventDefault = jest.fn();
  userChoice = Promise.resolve({ outcome: 'accepted' as const });
  prompt = jest.fn(() => Promise.resolve());

  constructor() {
    super('beforeinstallprompt', { cancelable: true });
  }
}

describe('InstallPrompt + InstallAppSetting mounted together (shared store, C1)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    isNativePlatform = false;
    __resetInstallEventStoreForTests();
    __resetInstallEngagementForTests();
    (usePathname as jest.Mock).mockReturnValue('/');
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
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36',
      configurable: true,
    });
  });

  it('both consumers see canInstall become true together when beforeinstallprompt fires', () => {
    render(
      <>
        <InstallPrompt />
        <InstallAppSetting />
      </>
    );

    // Before the event fires: the banner renders nothing yet, and the
    // settings entry shows its disabled/explanatory state.
    expect(
      screen.queryByRole('button', { name: /^instalar$/i })
    ).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new FakeBeforeInstallPromptEvent());
    });

    // Both surfaces must now expose an enabled install action — the exact
    // bug was the settings entry staying stuck on "no ofreció la
    // instalación" forever because it never received the event.
    const installButtons = screen.getAllByRole('button', {
      name: /^instalar$/i,
    });
    expect(installButtons.length).toBeGreaterThanOrEqual(2);
    installButtons.forEach((button) => expect(button).toBeEnabled());
  });

  it('an event stashed before mount (early capture) is seen by both consumers', () => {
    const event = new FakeBeforeInstallPromptEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    render(
      <>
        <InstallPrompt />
        <InstallAppSetting />
      </>
    );

    const installButtons = screen.getAllByRole('button', {
      name: /^instalar$/i,
    });
    expect(installButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('records exactly one visit in localStorage even with two usePwaInstall() consumers mounted', () => {
    render(
      <>
        <InstallPrompt />
        <InstallAppSetting />
      </>
    );

    expect(window.localStorage.getItem(VISIT_COUNT_KEY)).toBe('1');
  });
});

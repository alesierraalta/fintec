import { StrictMode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import {
  PWA_INSTALL_EVENT_WINDOW_KEY,
  __resetInstallEventStoreForTests,
} from '@/lib/pwa/install-event-store';
import { __resetInstallEngagementForTests } from '@/lib/pwa/install-engagement';

const DISMISSAL_KEY = 'fintec.pwa-install.dismissed-at';
const VISIT_COUNT_KEY = 'fintec.pwa-install.visit-count';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let isNativePlatform = false;

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
  },
}));

class FakeBeforeInstallPromptEvent extends Event {
  preventDefault = jest.fn();
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  private resolveChoice!: (value: {
    outcome: 'accepted' | 'dismissed';
  }) => void;
  prompt = jest.fn(() => {
    return Promise.resolve();
  });

  constructor() {
    super('beforeinstallprompt', { cancelable: true });
    this.userChoice = new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  resolveWith(outcome: 'accepted' | 'dismissed') {
    this.resolveChoice({ outcome });
  }
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    window.localStorage.clear();
    isNativePlatform = false;
    __resetInstallEventStoreForTests();
    __resetInstallEngagementForTests();
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

  it('captures beforeinstallprompt, prevents the default banner, and enables canInstall', () => {
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canInstall).toBe(false);

    const event = new FakeBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(true);
  });

  it('promptInstall triggers the retained deferred event and resolves with the outcome', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = new FakeBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });

    let outcome: string;
    await act(async () => {
      const promptPromise = result.current.promptInstall();
      event.resolveWith('accepted');
      outcome = await promptPromise;
    });

    expect(event.prompt).toHaveBeenCalled();
    expect(outcome).toBe('accepted');
  });

  it('promptInstall resolves unavailable when no deferred event was captured', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const outcome = await result.current.promptInstall();

    expect(outcome).toBe('unavailable');
  });

  it('promptInstall resolves unavailable and clears canInstall when prompt() rejects', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = new FakeBeforeInstallPromptEvent();
    event.prompt = jest
      .fn()
      .mockRejectedValue(
        new Error(
          'InvalidStateError: The prompt() method may only be called once.'
        )
      );
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.canInstall).toBe(true);

    let outcome: string;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome!).toBe('unavailable');
    expect(result.current.canInstall).toBe(false);
  });

  it('promptInstall clears the shared store so every mounted consumer (including a remount) sees canInstall false', async () => {
    const event = new FakeBeforeInstallPromptEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    const { result: bannerResult } = renderHook(() => usePwaInstall());
    const { result: settingsResult } = renderHook(() => usePwaInstall());
    expect(bannerResult.current.canInstall).toBe(true);
    expect(settingsResult.current.canInstall).toBe(true);

    await act(async () => {
      const promptPromise = bannerResult.current.promptInstall();
      event.resolveWith('accepted');
      await promptPromise;
    });

    expect(bannerResult.current.canInstall).toBe(false);
    expect(settingsResult.current.canInstall).toBe(false);

    const { result: remounted } = renderHook(() => usePwaInstall());
    expect(remounted.current.canInstall).toBe(false);
  });

  it('appinstalled permanently disables canInstall, independent of the cooldown', () => {
    const { result } = renderHook(() => usePwaInstall());

    const event = new FakeBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('dismiss persists the timestamp so a remount within 30 days keeps isDismissed true', () => {
    const { result, unmount } = renderHook(() => usePwaInstall());

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.isDismissed).toBe(true);
    unmount();

    const { result: remounted } = renderHook(() => usePwaInstall());
    expect(remounted.current.isDismissed).toBe(true);
  });

  it('treats an expired cooldown as not dismissed', () => {
    const staleTimestamp = Date.now() - (THIRTY_DAYS_MS + 1000);
    window.localStorage.setItem(DISMISSAL_KEY, String(staleTimestamp));

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.isDismissed).toBe(false);
  });

  it('treats corrupt localStorage as not dismissed and does not throw', () => {
    window.localStorage.setItem(DISMISSAL_KEY, 'not-a-timestamp');

    expect(() => {
      const { result } = renderHook(() => usePwaInstall());
      expect(result.current.isDismissed).toBe(false);
    }).not.toThrow();
  });

  it('hideForSession hides transiently without persisting the dismissal cooldown', () => {
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.isHiddenThisSession).toBe(false);

    act(() => {
      result.current.hideForSession();
    });

    expect(result.current.isHiddenThisSession).toBe(true);
    // The core of the M4 fix: hideForSession must NEVER write the
    // persisted dismissal key, unlike dismiss().
    expect(window.localStorage.getItem(DISMISSAL_KEY)).toBeNull();
    expect(result.current.isDismissed).toBe(false);
  });

  it('hideForSession does not survive a remount (transient, not persisted)', () => {
    const { result, unmount } = renderHook(() => usePwaInstall());

    act(() => {
      result.current.hideForSession();
    });
    expect(result.current.isHiddenThisSession).toBe(true);
    unmount();

    const { result: remounted } = renderHook(() => usePwaInstall());
    expect(remounted.current.isHiddenThisSession).toBe(false);
  });

  it('removes the exact same listeners it added, on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePwaInstall());
    const added = addSpy.mock.calls.filter(
      ([type]) => type === 'beforeinstallprompt' || type === 'appinstalled'
    );

    unmount();

    const removed = removeSpy.mock.calls.filter(
      ([type]) => type === 'beforeinstallprompt' || type === 'appinstalled'
    );

    // The shared store (lib/pwa/install-event-store.ts) owns this
    // subscription now, and it is adopted once per module lifetime, not
    // once per hook instance — so unmounting one hook instance must not
    // remove the store's own live listeners while other instances (or a
    // future mount) still depend on them.
    expect(added.length).toBeGreaterThan(0);
    expect(removed.length).toBe(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('resolves unsupported platform inside the Capacitor native shell', () => {
    isNativePlatform = true;

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.platform).toBe('unsupported');
    expect(result.current.promptKind).toBe('none');
  });

  it('picks up an event stashed before the hook mounts (early-capture)', () => {
    // Simulates the inline capture script in app/layout.tsx firing and
    // stashing the event on `window` before React ever hydrates. Chrome
    // dispatches `beforeinstallprompt` as soon as install criteria are met
    // — often before hydration — so a listener attached only inside
    // `useEffect` loses it permanently.
    const event = new FakeBeforeInstallPromptEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canInstall).toBe(true);
  });

  it('does not render the iOS sheet before the engagement threshold (isIosPromptEligible gate)', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.platform).toBe('ios');
    expect(result.current.promptKind).toBe('instructions');
    expect(result.current.isIosPromptEligible).toBe(false);
  });

  it('becomes eligible once the persisted visit count already reflects one prior visit', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    window.localStorage.setItem(VISIT_COUNT_KEY, '1');

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.platform).toBe('ios');
    expect(result.current.isIosPromptEligible).toBe(true);
  });

  it('does not double-count a visit when the mount effect runs twice under StrictMode', () => {
    renderHook(() => usePwaInstall(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });

    expect(window.localStorage.getItem(VISIT_COUNT_KEY)).toBe('1');
  });

  it('does not double-count a visit when two usePwaInstall() consumers mount on the same page load', () => {
    // The banner (InstallPrompt) and the settings entry
    // (InstallAppSetting) can both be mounted on the same page load. The
    // visit counter must reflect ONE real visit, not one per consumer.
    renderHook(() => usePwaInstall());
    renderHook(() => usePwaInstall());

    expect(window.localStorage.getItem(VISIT_COUNT_KEY)).toBe('1');
  });
});

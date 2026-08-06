import {
  PWA_INSTALL_EVENT_WINDOW_KEY,
  PWA_INSTALL_APP_INSTALLED_WINDOW_KEY,
  clearDeferredInstallEvent,
  getDeferredInstallEvent,
  getIsAppInstalled,
  subscribe,
  __resetInstallEventStoreForTests,
} from '@/lib/pwa/install-event-store';

function fakeDeferredEvent() {
  return Object.assign(new Event('beforeinstallprompt'), {
    prompt: jest.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
}

describe('install-event-store (shared, single-owner store)', () => {
  beforeEach(() => {
    __resetInstallEventStoreForTests();
    delete (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ];
    delete (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_APP_INSTALLED_WINDOW_KEY
    ];
  });

  it('adopts an event stashed on window before any accessor is called', () => {
    const event = fakeDeferredEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    expect(getDeferredInstallEvent()).toBe(event);
  });

  it('clears the window key after adopting it, so nothing else can read a stale reference', () => {
    const event = fakeDeferredEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    getDeferredInstallEvent();

    expect(
      (window as unknown as Record<string, unknown>)[
        PWA_INSTALL_EVENT_WINDOW_KEY
      ]
    ).toBeNull();
  });

  it('gives every reader the exact same event — the core of the single-owner fix', () => {
    const event = fakeDeferredEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;

    const firstReader = getDeferredInstallEvent();
    const secondReader = getDeferredInstallEvent();

    expect(firstReader).toBe(event);
    expect(secondReader).toBe(event);
  });

  it('notifies every subscriber when a live beforeinstallprompt event arrives', () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    subscribe(listenerA);
    subscribe(listenerB);

    const event = fakeDeferredEvent();
    window.dispatchEvent(event);

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
    expect(getDeferredInstallEvent()).toBe(event);
  });

  it('notifies every subscriber and clears the event on appinstalled', () => {
    const event = fakeDeferredEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;
    getDeferredInstallEvent();

    const listener = jest.fn();
    subscribe(listener);

    window.dispatchEvent(new Event('appinstalled'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getDeferredInstallEvent()).toBeNull();
    expect(getIsAppInstalled()).toBe(true);
  });

  it('clearDeferredInstallEvent clears the event and notifies every subscriber together', () => {
    const event = fakeDeferredEvent();
    (window as unknown as Record<string, unknown>)[
      PWA_INSTALL_EVENT_WINDOW_KEY
    ] = event;
    getDeferredInstallEvent();

    const listenerA = jest.fn();
    const listenerB = jest.fn();
    subscribe(listenerA);
    subscribe(listenerB);

    clearDeferredInstallEvent();

    expect(getDeferredInstallEvent()).toBeNull();
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops further notifications', () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    window.dispatchEvent(fakeDeferredEvent());

    expect(listener).not.toHaveBeenCalled();
  });
});

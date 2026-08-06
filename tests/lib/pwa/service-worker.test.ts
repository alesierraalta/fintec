import { registerServiceWorker } from '@/lib/pwa/service-worker';

let isNativePlatform = false;

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
  },
}));

const originalEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
  });
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    setNodeEnv(originalEnv as string);
    isNativePlatform = false;
    // @ts-expect-error - test cleanup: navigator.serviceWorker is not part of the base lib.dom typing override
    delete (navigator as any).serviceWorker;
  });

  it('registers /sw.js exactly once in production', async () => {
    setNodeEnv('production');
    const register = jest.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    await registerServiceWorker();

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does not register in development', async () => {
    setNodeEnv('development');
    const register = jest.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    await registerServiceWorker();

    expect(register).not.toHaveBeenCalled();
  });

  it('does not throw when navigator.serviceWorker is unavailable', async () => {
    setNodeEnv('production');
    delete (navigator as any).serviceWorker;

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('handles a rejected register() promise without throwing', async () => {
    setNodeEnv('production');
    const register = jest.fn().mockRejectedValue(new Error('boom'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('does not register inside the Capacitor native shell', async () => {
    setNodeEnv('production');
    isNativePlatform = true;
    const register = jest.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    await registerServiceWorker();

    expect(register).not.toHaveBeenCalled();
  });

  describe('requestPersistentStorage (M1: protect the shared origin bucket)', () => {
    afterEach(() => {
      // @ts-expect-error - test cleanup: navigator.storage is not part of the base lib.dom typing override
      delete (navigator as any).storage;
    });

    it('calls navigator.storage.persist() alongside a successful registration', async () => {
      setNodeEnv('production');
      const register = jest.fn().mockResolvedValue({});
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register },
        configurable: true,
      });
      const persist = jest.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'storage', {
        value: { persist },
        configurable: true,
      });

      await registerServiceWorker();

      expect(persist).toHaveBeenCalledTimes(1);
    });

    it('does not throw when navigator.storage is unavailable', async () => {
      setNodeEnv('production');
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: jest.fn().mockResolvedValue({}) },
        configurable: true,
      });
      delete (navigator as any).storage;

      await expect(registerServiceWorker()).resolves.toBeUndefined();
    });

    it('does not throw when navigator.storage.persist() rejects', async () => {
      setNodeEnv('production');
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: jest.fn().mockResolvedValue({}) },
        configurable: true,
      });
      Object.defineProperty(navigator, 'storage', {
        value: { persist: jest.fn().mockRejectedValue(new Error('denied')) },
        configurable: true,
      });

      await expect(registerServiceWorker()).resolves.toBeUndefined();
    });
  });
});

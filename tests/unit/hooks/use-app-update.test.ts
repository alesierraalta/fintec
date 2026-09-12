import { renderHook, act, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  useAppUpdate,
  APPLIED_STORAGE_KEY,
  DISMISS_STORAGE_KEY,
} from '@/hooks/use-app-update';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
  },
}));

jest.mock('@capacitor/app', () => ({
  App: {
    getInfo: jest.fn(),
  },
}));

describe('useAppUpdate hook', () => {
  const mockIsNativePlatform = Capacitor.isNativePlatform as jest.Mock;
  const mockGetInfo = App.getInfo as jest.Mock;
  const originalLocation = window.location;

  const mockVersionPayload = {
    latestVersionName: '1.0.2',
    latestVersionCode: 3,
    minRequiredVersionCode: 1,
    apkUrl: '/fintec-beta.apk',
    releaseNotes: 'Novedades: Flujo Scan-to-Confirm en 1 tap',
    publishedAt: '2026-09-12T00:00:00Z',
  };

  beforeAll(() => {
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      ...originalLocation,
      reload: jest.fn(),
      origin: 'https://fintec.app',
      href: 'https://fintec.app',
    };

    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = jest.fn();
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = jest.fn();
    }
  });

  afterAll(() => {
    (window as unknown as { location: unknown }).location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockIsNativePlatform.mockReturnValue(false);
    mockGetInfo.mockResolvedValue({
      name: 'FinTec',
      id: 'com.fintec.app',
      build: '2',
      version: '1.0.1',
    });

    jest
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:https://fintec.app/mock-blob');
    jest.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/app/version')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockVersionPayload,
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        blob: async () => new Blob(['mock-apk']),
      } as unknown as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns hasUpdate=false when not on native platform (web)', async () => {
    mockIsNativePlatform.mockReturnValue(false);

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.latestVersion).toBe('1.0.2');
    });

    expect(result.current.isNative).toBe(false);
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
  });

  it('detects available update when native platform currentBuild < latestBuild', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockGetInfo.mockResolvedValue({
      name: 'FinTec',
      id: 'com.fintec.app',
      build: '2',
      version: '1.0.1',
    });

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.isNative).toBe(true);
      expect(result.current.hasUpdate).toBe(true);
    });

    expect(result.current.currentVersion).toBe('1.0.1');
    expect(result.current.currentBuild).toBe(2);
    expect(result.current.latestVersion).toBe('1.0.2');
    expect(result.current.latestBuild).toBe(3);
    expect(result.current.releaseNotes).toBe(
      'Novedades: Flujo Scan-to-Confirm en 1 tap'
    );
    expect(result.current.apkUrl).toBe('/fintec-beta.apk');
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.isUpdating).toBe(false);
  });

  it('allows dismissing an update and saves to localStorage', async () => {
    mockIsNativePlatform.mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.isDismissed).toBe(true);

    const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.versionCode).toBe(3);
    expect(typeof parsed.dismissedAt).toBe('number');
  });

  it('recognizes recent dismissal (<24h) on initial load', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    localStorage.setItem(
      DISMISS_STORAGE_KEY,
      JSON.stringify({
        versionCode: 3,
        dismissedAt: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
      })
    );

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.latestBuild).toBe(3);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.updateAvailable).toBe(true);
  });

  it('ignores expired dismissal (>24h) on initial load', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    localStorage.setItem(
      DISMISS_STORAGE_KEY,
      JSON.stringify({
        versionCode: 3,
        dismissedAt: Date.now() - 25 * 60 * 60 * 1000, // 25h ago
      })
    );

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.latestBuild).toBe(3);
    });

    expect(result.current.isDismissed).toBe(false);
    expect(result.current.hasUpdate).toBe(true);
  });

  it('returns hasUpdate=false when already on latest build or newer', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockGetInfo.mockResolvedValue({
      name: 'FinTec',
      id: 'com.fintec.app',
      build: '3',
      version: '1.0.2',
    });

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.currentBuild).toBe(3);
    });

    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
  });

  it('returns hasUpdate=false and updateAvailable=false when latestBuild has already been applied', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    localStorage.setItem(APPLIED_STORAGE_KEY, '3');

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.latestBuild).toBe(3);
    });

    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.hasUpdate).toBe(false);
  });

  it('triggerUpdate saves to APPLIED_STORAGE_KEY, triggers in-app reload, and does not open external browser', async () => {
    mockIsNativePlatform.mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });

    await act(async () => {
      await result.current.triggerUpdate();
    });

    expect(localStorage.getItem(APPLIED_STORAGE_KEY)).toBe('3');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
  });

  it('downloadApkInApp downloads APK via blob in background without external browser', async () => {
    mockIsNativePlatform.mockReturnValue(true);

    const mockBlob = new Blob(['mock-binary-content'], {
      type: 'application/vnd.android.package-archive',
    });
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/app/version')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockVersionPayload,
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        blob: async () => mockBlob,
      } as unknown as Response);
    });

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.latestBuild).toBe(3);
    });

    await act(async () => {
      await result.current.downloadApkInApp();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fintec-beta.apk')
    );
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(clickSpy).toHaveBeenCalled();
  });
});

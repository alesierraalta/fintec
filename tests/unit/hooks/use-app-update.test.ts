import { renderHook, act, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useAppUpdate } from '@/hooks/use-app-update';

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

jest.mock('@capacitor/browser', () => ({
  Browser: {
    open: jest.fn(),
  },
}));

describe('useAppUpdate hook', () => {
  const mockIsNativePlatform = Capacitor.isNativePlatform as jest.Mock;
  const mockGetInfo = App.getInfo as jest.Mock;
  const mockBrowserOpen = Browser.open as jest.Mock;

  const mockVersionPayload = {
    latestVersionName: '1.0.2',
    latestVersionCode: 3,
    minRequiredVersionCode: 1,
    apkUrl: '/fintec-beta.apk',
    releaseNotes: 'Novedades: Flujo Scan-to-Confirm en 1 tap',
    publishedAt: '2026-09-12T00:00:00Z',
  };

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
    mockBrowserOpen.mockResolvedValue(undefined);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVersionPayload,
    } as unknown as Response);
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

    const stored = localStorage.getItem('fintec_app_update_dismissed');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.versionCode).toBe(3);
    expect(typeof parsed.dismissedAt).toBe('number');
  });

  it('recognizes recent dismissal (<24h) on initial load', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    localStorage.setItem(
      'fintec_app_update_dismissed',
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
      'fintec_app_update_dismissed',
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

  it('triggerUpdate opens native Browser on native platform', async () => {
    mockIsNativePlatform.mockReturnValue(true);

    const { result } = renderHook(() => useAppUpdate());

    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });

    await act(async () => {
      await result.current.triggerUpdate();
    });

    expect(mockBrowserOpen).toHaveBeenCalledTimes(1);
    expect(mockBrowserOpen).toHaveBeenCalledWith({
      url: expect.stringContaining('/fintec-beta.apk'),
    });
  });
});

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { AppVersionResponse } from '@/app/api/app/version/route';

const DISMISS_STORAGE_KEY = 'fintec_app_update_dismissed';
const DISMISS_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UseAppUpdateReturn {
  isNative: boolean;
  hasUpdate: boolean;
  isDismissed: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  currentBuild: number;
  latestVersion: string;
  latestBuild: number;
  releaseNotes: string;
  apkUrl: string;
  dismissUpdate: () => void;
  triggerUpdate: () => void;
}

interface DismissRecord {
  versionCode: number;
  dismissedAt: number;
}

function isVersionDismissed(targetCode: number): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const parsed: DismissRecord = JSON.parse(raw);
    if (
      parsed?.versionCode === targetCode &&
      typeof parsed?.dismissedAt === 'number'
    ) {
      return Date.now() - parsed.dismissedAt < DISMISS_TIMEOUT_MS;
    }
    return false;
  } catch {
    return false;
  }
}

export function useAppUpdate(): UseAppUpdateReturn {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.1');
  const [currentBuild, setCurrentBuild] = useState<number>(0);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [latestBuild, setLatestBuild] = useState<number>(0);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [apkUrl, setApkUrl] = useState<string>('/fintec-beta.apk');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkVersion() {
      const native = Capacitor.isNativePlatform();
      if (!isMounted) return;
      setIsNative(native);

      try {
        let appBuild = 0;
        if (native) {
          try {
            const info = await App.getInfo();
            if (!isMounted) return;
            if (info?.version) setCurrentVersion(info.version);
            if (info?.build) {
              appBuild = parseInt(info.build, 10) || 0;
              setCurrentBuild(appBuild);
            }
          } catch {
            // App.getInfo failed or not supported
          }
        }

        const res = await fetch('/api/app/version');
        if (!res.ok || !isMounted) return;

        const data: AppVersionResponse = await res.json();
        if (!isMounted) return;

        const targetBuild =
          typeof data.latestVersionCode === 'number'
            ? data.latestVersionCode
            : parseInt(String(data.latestVersionCode), 10) || 0;

        setLatestVersion(data.latestVersionName || '');
        setLatestBuild(targetBuild);
        setReleaseNotes(data.releaseNotes || '');
        if (data.apkUrl) setApkUrl(data.apkUrl);

        const dismissed = isVersionDismissed(targetBuild);
        setIsDismissed(dismissed);
      } catch {
        // Network or parsing errors fail gracefully
      }
    }

    checkVersion();

    return () => {
      isMounted = false;
    };
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const record: DismissRecord = {
          versionCode: latestBuild,
          dismissedAt: Date.now(),
        };
        window.localStorage.setItem(
          DISMISS_STORAGE_KEY,
          JSON.stringify(record)
        );
      }
    } catch {
      // localStorage may fail in restricted environments
    }
  }, [latestBuild]);

  const triggerUpdate = useCallback(async () => {
    const targetUrl = apkUrl || '/fintec-beta.apk';
    const baseUrl =
      typeof window !== 'undefined' &&
      window.location?.origin &&
      !window.location.origin.includes('localhost')
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'https://fintec.vercel.app';

    const resolvedUrl =
      targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
        ? targetUrl
        : `${baseUrl.replace(/\/$/, '')}${targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`}`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: resolvedUrl });
        return;
      } catch {
        // Fallback to direct navigation
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = resolvedUrl;
    }
  }, [apkUrl]);

  const updateAvailable = Boolean(isNative && latestBuild > currentBuild);
  const hasUpdate = Boolean(updateAvailable && !isDismissed);

  return {
    isNative,
    hasUpdate,
    isDismissed,
    updateAvailable,
    currentVersion,
    currentBuild,
    latestVersion,
    latestBuild,
    releaseNotes,
    apkUrl,
    dismissUpdate,
    triggerUpdate,
  };
}

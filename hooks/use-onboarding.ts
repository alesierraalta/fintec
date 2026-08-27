'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsNative } from './use-is-native';

export const ONBOARDING_STORAGE_KEY = 'fintec-onboarding-v1';

type PreferencesModule = {
  Preferences: {
    get(options: { key: string }): Promise<{ value: string | null }>;
    set(options: { key: string; value: string }): Promise<void>;
  };
};

async function getPreferences(): Promise<PreferencesModule['Preferences'] | null> {
  try {
    // Keep the optional native plugin out of the web bundle when it is not installed.
    const load = new Function(
      'return import("@capacitor/preferences")'
    ) as () => Promise<PreferencesModule>;
    const module = await load();
    return module.Preferences;
  } catch {
    return null;
  }
}

async function hasBeenSeen(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const preferences = await getPreferences();
  if (preferences) {
    const { value } = await preferences.get({ key: ONBOARDING_STORAGE_KEY });
    return value === '1';
  }

  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
}

export async function markSeen(): Promise<void> {
  if (typeof window === 'undefined') return;

  const preferences = await getPreferences();
  if (preferences) {
    await preferences.set({ key: ONBOARDING_STORAGE_KEY, value: '1' });
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
}

export function useOnboarding() {
  const isNative = useIsNative();
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isNative) {
      setIsVisible(false);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    void hasBeenSeen()
      .then((seen) => {
        if (active) setIsVisible(!seen);
      })
      .catch(() => {
        if (active) setIsVisible(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isNative]);

  const finish = useCallback(async () => {
    setIsVisible(false);
    try {
      await markSeen();
    } catch {
      // The in-memory dismissal still lets the user continue if storage is unavailable.
    }
  }, []);

  return {
    isLoading,
    isVisible,
    completeOnboarding: finish,
    skipOnboarding: finish,
  };
}

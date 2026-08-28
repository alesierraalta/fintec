'use client';

import { App, type BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  TransientBackRegistry,
  type TransientBackEntry,
} from '@/lib/navigation/transient-back-registry';
import { useAppNavigation } from '@/components/providers/app-navigation-provider';

type RegisterTransient = (entry: TransientBackEntry) => () => void;
const RegistryContext = createContext<RegisterTransient>(() => () => undefined);

export function useNativeBackNavigation(): RegisterTransient {
  return useContext(RegistryContext);
}

export interface NativeBackNavigationProps {
  children: ReactNode;
  exit?: () => Promise<void> | void;
}

export function NativeBackNavigation({
  children,
  exit = () => App.exitApp(),
}: NativeBackNavigationProps) {
  const router = useRouter();
  const { push } = router;
  const pathname = usePathname();
  const { back } = useAppNavigation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const registryRef = useRef<TransientBackRegistry>();
  if (!registryRef.current) registryRef.current = new TransientBackRegistry();
  const exitRef = useRef(exit);
  exitRef.current = exit;
  const register = useCallback<RegisterTransient>(
    (entry) => registryRef.current!.register(entry),
    []
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let mounted = true;
    let handle: { remove: () => Promise<void> | void } | undefined;
    const onBack = (_event: BackButtonListenerEvent) => {
      if (registryRef.current!.closeTop()) return;
      const target = back();
      if (target) {
        push(target);
        return;
      }
      void exitRef.current();
    };
    const onBrowserBack = () => {
      if (registryRef.current!.closeTop()) return;
      const target = back();
      if (target && target !== pathnameRef.current) push(target);
    };
    window.addEventListener('popstate', onBrowserBack);
    App.addListener('backButton', onBack).then((listener) => {
      if (mounted) handle = listener;
      else void listener.remove();
    });
    return () => {
      mounted = false;
      window.removeEventListener('popstate', onBrowserBack);
      if (handle) void handle.remove();
    };
  }, [back, push]);

  const value = useMemo(() => register, [register]);
  return (
    <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>
  );
}

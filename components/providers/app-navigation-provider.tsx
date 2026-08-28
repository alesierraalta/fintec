'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppNavigationStack, APP_ROOT } from '@/lib/navigation/app-navigation-stack';

type NavigationContextValue = {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => string | undefined;
  canGoBack: boolean;
  isAtRoot: boolean;
  entries: string[];
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useAppNavigation(): NavigationContextValue {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('useAppNavigation must be used within AppNavigationProvider');
  return navigation;
}

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? APP_ROOT;
  const stackRef = useRef<AppNavigationStack>();
  const pendingPathRef = useRef<string | undefined>();
  const [version, render] = useState(0);

  if (!stackRef.current) stackRef.current = new AppNavigationStack(pathname);

  useEffect(() => {
    const pending = pendingPathRef.current;
    if (pending === pathname) {
      pendingPathRef.current = undefined;
      return;
    }
    if (pending) pendingPathRef.current = undefined;
    stackRef.current!.push(pathname);
    render((value) => value + 1);
  }, [pathname]);

  const push = useCallback((path: string) => {
    stackRef.current!.push(path);
    pendingPathRef.current = path;
    render((value) => value + 1);
    router.push(path);
  }, [router]);

  const replace = useCallback((path: string) => {
    stackRef.current!.reset(path);
    pendingPathRef.current = path;
    render((value) => value + 1);
    router.replace(path);
  }, [router]);

  const back = useCallback(() => {
    const target = stackRef.current!.pop();
    if (target) {
      pendingPathRef.current = target;
      render((value) => value + 1);
    }
    return target;
  }, []);

  const value = useMemo<NavigationContextValue>(() => {
    const stack = stackRef.current!;
    return {
      push,
      replace,
      back,
      canGoBack: stack.canGoBack(),
      isAtRoot: stack.isAtRoot(),
      entries: stack.snapshot,
    };
  }, [back, push, replace, version]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

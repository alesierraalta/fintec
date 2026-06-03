'use client';

/**
 * NativeOAuthListener — REQ-11, REQ-12
 *
 * Headless provider that registers the Capacitor App 'appUrlOpen' deep-link
 * listener exactly once, at mount.  On unmount it removes the listener to
 * prevent double-registration across React Strict Mode remounts.
 *
 * Wire this component inside RouteAwareProviders (inside AuthProvider so the
 * router is available via the next/navigation hooks it uses internally).
 */

import { type ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { registerDeepLinkHandler, type DeepLinkHandle } from '@/lib/auth/capacitor-oauth';

interface NativeOAuthListenerProps {
  children?: ReactNode;
}

export function NativeOAuthListener({ children }: NativeOAuthListenerProps) {
  const router = useRouter();
  const handleRef = useRef<DeepLinkHandle | null>(null);

  useEffect(() => {
    let mounted = true;

    registerDeepLinkHandler(router.push).then((handle) => {
      if (mounted) {
        handleRef.current = handle;
      } else {
        // Component unmounted before the promise resolved — clean up immediately
        handle.remove();
      }
    });

    return () => {
      mounted = false;
      if (handleRef.current) {
        handleRef.current.remove();
        handleRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children ? <>{children}</> : null;
}

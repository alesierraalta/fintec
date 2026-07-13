'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  SubscriptionTier,
  Subscription,
  UsageTracking,
  UsageStatus,
  Feature,
  FEATURE_ACCESS,
  SubscriptionStatusPayload,
} from '@/types/subscription';

const SUBSCRIPTION_CACHE_TTL_MS = 30000;

// Module-level cache + in-flight dedup, shared across every consumer of the
// provider. Also doubles as the SSR-hydration bridge for `hydrate(payload)`.
// Kept module-private: nothing outside this file needs direct access, all
// interaction goes through `fetchSubscriptionStatus`/`hydrate`.
const subscriptionCache = new Map<
  string,
  { data: SubscriptionStatusPayload; fetchedAt: number }
>();
const inFlightRequests = new Map<string, Promise<SubscriptionStatusPayload>>();

const SUBSCRIPTION_FETCH_TIMEOUT_MS = 10000;

/** Error thrown by `fetchSubscriptionStatus` for a non-ok HTTP response,
 * carrying the status code so callers can distinguish auth rejections
 * (401/403 -> fail closed) from transient network/server errors
 * (keep last-known tier, just surface `error`). */
class SubscriptionFetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SubscriptionFetchError';
    this.status = status;
  }
}

async function fetchSubscriptionStatus(
  userId: string,
  accessToken: string,
  options?: { force?: boolean }
): Promise<SubscriptionStatusPayload> {
  const cacheEntry = subscriptionCache.get(userId);
  if (
    !options?.force &&
    cacheEntry &&
    Date.now() - cacheEntry.fetchedAt < SUBSCRIPTION_CACHE_TTL_MS
  ) {
    return cacheEntry.data;
  }

  const existingRequest = inFlightRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    // Race the fetch against an explicit timeout so a hanging request can
    // never leave `inFlightRequests`/`loading` stuck forever tab-wide.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(
          new SubscriptionFetchError('Subscription status request timed out')
        );
      }, SUBSCRIPTION_FETCH_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([
        fetch('/api/subscription/status', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);

      if (!response.ok) {
        throw new SubscriptionFetchError(
          'Failed to fetch subscription',
          response.status
        );
      }

      const result = (await response.json()) as SubscriptionStatusPayload;
      subscriptionCache.set(userId, { data: result, fetchedAt: Date.now() });
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  inFlightRequests.set(userId, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(userId);
  }
}

function mapSubscriptionPayloadToData(
  payload: SubscriptionStatusPayload
): Omit<SubscriptionData, 'loading' | 'error'> {
  return {
    subscription: payload.subscription,
    tier: payload.tier || 'free',
    usage: payload.usage as UsageTracking | null,
    usageStatus: payload.usageStatus,
  };
}

interface SubscriptionData {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  usage: UsageTracking | null;
  usageStatus: UsageStatus | null;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionContextValue extends SubscriptionData {
  hasFeature: (feature: Feature) => boolean;
  isApproachingLimit: (resource: keyof UsageStatus) => boolean;
  isAtLimit: (resource: keyof UsageStatus) => boolean;
  canUpgrade: boolean;
  isPremium: boolean;
  isBase: boolean;
  isFree: boolean;
  refresh: () => Promise<void>;
  /** Internal: seeds state from an SSR-provided payload without a fetch. */
  hydrate: (payload: SubscriptionStatusPayload) => void;
}

export const SubscriptionContext = createContext<
  SubscriptionContextValue | undefined
>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user, session } = useAuth();
  // Always holds the currently-authenticated user id. Used to guard against
  // a stale, late-resolving fetch for a PREVIOUS user overwriting the
  // current user's state after signOut/signIn (signOut does not reload the
  // page, so an in-flight request can outlive the session it was issued for).
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  currentUserIdRef.current = user?.id ?? null;

  // One-shot guard: when `hydrate()` runs (via a consumer's synchronous
  // `useLayoutEffect`) before the mount effect below ever executes, that
  // very first mount-effect run is redundant (state is already fresh) and
  // is skipped. This flag is consumed strictly by the FIRST invocation of
  // the mount effect only (`hasRunMountEffectRef` below) — any LATER
  // invocation (e.g. triggered by a token refresh changing
  // `fetchSubscription`'s identity) always fetches, so a legitimate refetch
  // is never suppressed by a hydrate that happened long before.
  const skipNextFetchRef = useRef(false);
  const hasRunMountEffectRef = useRef(false);

  const [data, setData] = useState<SubscriptionData>({
    subscription: null,
    tier: 'free',
    usage: null,
    usageStatus: null,
    loading: true,
    error: null,
  });

  const fetchSubscription = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id || !session?.access_token) {
        setData({
          subscription: null,
          tier: 'free',
          usage: null,
          usageStatus: null,
          loading: false,
          error: null,
        });
        return;
      }

      const requestingUserId = user.id;

      try {
        setData((prev) => ({
          ...prev,
          // Only show the loading spinner on a genuinely first load (no data
          // yet). A background refresh (window focus, token refresh, manual
          // refresh()) reuses the last-known data so the UI never flashes.
          loading: prev.subscription === null && prev.usageStatus === null,
          error: null,
        }));
        const result = await fetchSubscriptionStatus(
          user.id,
          session.access_token,
          options
        );

        // Bail out if the user changed while this request was in flight —
        // otherwise a slow response for a previous user could overwrite the
        // current user's tier (privilege boundary violation).
        if (currentUserIdRef.current !== requestingUserId) {
          return;
        }

        setData((prev) => ({
          ...prev,
          ...mapSubscriptionPayloadToData(result),
          loading: false,
          error: null,
        }));
      } catch (error: any) {
        if (currentUserIdRef.current !== requestingUserId) {
          return;
        }

        const status: number | undefined = error?.status;
        if (status === 401 || status === 403) {
          // Auth rejection: the access token is no longer valid for this
          // user, so fail CLOSED to the no-session default rather than
          // keeping a stale (potentially premium) tier on screen.
          setData({
            subscription: null,
            tier: 'free',
            usage: null,
            usageStatus: null,
            loading: false,
            error: error.message || 'Error loading subscription',
          });
        } else {
          // Transient error (network blip, timeout, 5xx): keep the
          // last-known tier so the UI doesn't flash, just surface `error`.
          setData((prev) => ({
            ...prev,
            loading: false,
            error: error.message || 'Error loading subscription',
          }));
        }
      }
    },
    [user?.id, session?.access_token]
  );

  useEffect(() => {
    if (!hasRunMountEffectRef.current && skipNextFetchRef.current) {
      hasRunMountEffectRef.current = true;
      skipNextFetchRef.current = false;
      return;
    }
    hasRunMountEffectRef.current = true;

    fetchSubscription();
  }, [fetchSubscription, user?.id]);

  // Refresh subscription on window focus (in case tier changed in another
  // tab, or the token was revoked). This respects the 30s cache TTL so rapid
  // alt-tab/refocus activity does not hammer the API; use refresh() for an
  // explicit, cache-bypassing reload.
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, fetchSubscription]);

  const hydrate = useCallback(
    (payload: SubscriptionStatusPayload) => {
      skipNextFetchRef.current = true;
      if (user?.id) {
        subscriptionCache.set(user.id, {
          data: payload,
          fetchedAt: Date.now(),
        });
      }
      setData({
        ...mapSubscriptionPayloadToData(payload),
        loading: false,
        error: null,
      });
    },
    [user?.id]
  );

  const hasFeature = useCallback(
    (feature: Feature): boolean => {
      return FEATURE_ACCESS[data.tier]?.includes(feature) || false;
    },
    [data.tier]
  );

  const isApproachingLimit = useCallback(
    (resource: keyof UsageStatus): boolean => {
      if (!data.usageStatus) return false;
      const status = data.usageStatus[resource];
      return status.percentage >= 80;
    },
    [data.usageStatus]
  );

  const isAtLimit = useCallback(
    (resource: keyof UsageStatus): boolean => {
      if (!data.usageStatus) return false;
      const status = data.usageStatus[resource];
      return status.percentage >= 100;
    },
    [data.usageStatus]
  );

  const canUpgrade = data.tier !== 'premium';
  const isPremium = data.tier === 'premium';
  const isBase = data.tier === 'base';
  const isFree = data.tier === 'free';

  const value: SubscriptionContextValue = {
    ...data,
    hasFeature,
    isApproachingLimit,
    isAtLimit,
    canUpgrade,
    isPremium,
    isBase,
    isFree,
    // Explicit refresh() calls are user/system-triggered checks (e.g. after
    // a 401) and must bypass the cache to reflect the server's current view.
    refresh: useCallback(
      () => fetchSubscription({ force: true }),
      [fetchSubscription]
    ),
    hydrate,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

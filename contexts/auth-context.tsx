'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import {
  User,
  Session,
  AuthError,
  PostgrestError,
} from '@supabase/supabase-js';
import { supabase } from '@/repositories/supabase/client';
import { clearAllOptimizedDataCaches } from '@/lib/cache/optimized-data-cache';
import { getOAuthRedirectTo } from '@/lib/auth/oauth-providers';

async function upsertUserProfileOnServer(payload: {
  name?: string;
  baseCurrency?: string;
  createWelcomeNotifications?: boolean;
}) {
  const response = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Failed to sync user profile');
  }
}

async function updateUserProfileOnServer(payload: Record<string, any>) {
  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Failed to update user profile');
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  baseCurrency: string;
  authError: string | null;
  clearAuthError: () => void;
  signUp: (
    email: string,
    password: string,
    userData?: any
  ) => Promise<{
    error: AuthError | null;
    emailConfirmationRequired?: boolean;
  }>;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (
    data: any
  ) => Promise<{ error: AuthError | PostgrestError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (next?: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [authError, setAuthError] = useState<string | null>(null);
  // Debounce ref: tracks which user.id has already had profile sync fired this
  // session to prevent duplicate welcome notifications on double SIGNED_IN.
  const syncedUserRef = useRef<string | null>(null);

  // Initialize Supabase auth session
  useEffect(() => {
    // Clear any old local sessions
    localStorage.removeItem('fintec_session');
    sessionStorage.removeItem('fintec_session_temp');

    setLoading(true);
  }, []);

  // Fetch user's base_currency from DB profile whenever user changes
  useEffect(() => {
    if (!user?.id) {
      setBaseCurrency('USD');
      return;
    }

    supabase
      .from('users')
      .select('base_currency')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.base_currency) {
          setBaseCurrency(data.base_currency);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    // T1.3 — REQ-05: use getUser() (server-verified) instead of getSession()
    // for the initial auth check. getSession() trusts client storage which can
    // be tampered with; getUser() revalidates the JWT against Supabase servers.
    supabase.auth.getUser().then(async ({ data: { user: verifiedUser } }) => {
      if (verifiedUser) {
        // Only fetch session (for access_token) when we KNOW the user is valid.
        const { data: { session: currentSession } } =
          await supabase.auth.getSession();
        setSession(currentSession);
        setUser(verifiedUser);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // T1.4 — REQ-06: sync profile on SIGNED_IN (not TOKEN_REFRESHED).
      // Debounced by user.id to prevent double-fire within one mount.
      if (event === 'SIGNED_IN' && session?.user) {
        const currentUser = session.user;

        if (syncedUserRef.current !== currentUser.id) {
          syncedUserRef.current = currentUser.id;

          // First-login detection: created_at within ~10 s of now means this
          // is the very first sign-in → gate welcome notifications to this case.
          const createdMs = currentUser.created_at
            ? new Date(currentUser.created_at).getTime()
            : 0;
          const isFirstLogin = Date.now() - createdMs < 10_000;

          // Fire-and-forget — do NOT await so UI is not blocked.
          upsertUserProfileOnServer({
            name:
              currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              currentUser.email?.split('@')[0] ||
              'Usuario',
            createWelcomeNotifications: isFirstLogin,
          }).catch(() => {
            // Profile sync failure is non-fatal — do not surface to user.
          });
        }
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        clearAllOptimizedDataCaches();
        syncedUserRef.current = null;
        setUser(null);
        setSession(null);
        setBaseCurrency('USD');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, userData?: any) => {
      try {
        setAuthError(null); // Clear any previous errors

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData || {},
          },
        });

        // If there's an error during signup, set it in context
        if (error) {
          let errorMessage = error.message;

          // Translate common errors to user-friendly Spanish messages
          if (
            errorMessage.includes('already registered') ||
            errorMessage.includes('User already registered')
          ) {
            errorMessage =
              'Este correo ya está registrado. ¿Olvidaste tu contraseña?';
          } else if (
            errorMessage.includes('weak password') ||
            errorMessage.includes('Password')
          ) {
            errorMessage =
              'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números';
          } else if (
            errorMessage.includes('Email address') &&
            errorMessage.includes('is invalid')
          ) {
            // Supabase is blocking this specific email address
            errorMessage =
              'Este correo electrónico no puede ser usado para registro. Por favor usa un email corporativo o educativo válido.';
          } else if (errorMessage.includes('Invalid email')) {
            errorMessage = 'El formato del correo electrónico no es válido';
          } else if (errorMessage.includes('Email rate limit exceeded')) {
            errorMessage =
              'Demasiados intentos. Por favor espera un momento e intenta de nuevo.';
          } else if (
            errorMessage.includes('Signup requires a valid password')
          ) {
            errorMessage = 'La contraseña es requerida y debe ser válida';
          }

          setAuthError(errorMessage);
          return { error };
        }

        if (data.user) {
          // Check if the user already exists (identities array is empty)
          if (data.user.identities && data.user.identities.length === 0) {
            setAuthError(
              'Este correo ya está registrado. ¿Olvidaste tu contraseña?'
            );
            return {
              error: {
                message: 'Email already registered',
                name: 'AuthError',
                status: 400,
              } as AuthError,
            };
          }

          // Check if email confirmation is required
          const emailConfirmationRequired = !data.session;

          // Wait a moment for the session to be established (if applicable)
          if (data.session) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          if (data.session) {
            try {
              await upsertUserProfileOnServer({
                name:
                  userData?.full_name ||
                  data.user.email?.split('@')[0] ||
                  'Usuario',
                createWelcomeNotifications: true,
              });
            } catch {
              // Do not block signup completion on profile sync
            }
          }

          return { error: null, emailConfirmationRequired };
        }

        // If we reach here, something unexpected happened
        setAuthError(
          'Error inesperado al crear la cuenta. Por favor intenta de nuevo.'
        );
        return {
          error: {
            message: 'Error al crear la cuenta',
            name: 'AuthError',
            status: 500,
          } as AuthError,
        };
      } catch (err) {
        setAuthError(
          'Error inesperado durante el registro. Por favor intenta de nuevo.'
        );
        return { error: err as AuthError };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      try {
        setAuthError(null); // Clear any previous errors

        // Store rememberMe preference for cookie management
        if (rememberMe) {
          localStorage.setItem('fintec_remember_me', 'true');
        } else {
          localStorage.removeItem('fintec_remember_me');
        }

        // Use Supabase Auth
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        // If there's an authentication error, set it in context and return
        if (authError) {
          let errorMessage = authError.message;
          if (
            errorMessage === 'Invalid login credentials' ||
            errorMessage.includes('Invalid')
          ) {
            errorMessage =
              'Credenciales incorrectas. Verifica tu email y contraseña.';
          } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage =
              'Tu email aún no ha sido confirmado. Por favor revisa tu correo y haz clic en el enlace de confirmación.';
          } else if (errorMessage.includes('Email not verified')) {
            errorMessage =
              'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
          } else if (errorMessage.includes('User not found')) {
            errorMessage =
              'No existe una cuenta con este email. ¿Deseas registrarte?';
          }
          setAuthError(errorMessage);
          return { error: authError };
        }

        // Check if we got valid user and session data
        if (authData.user && authData.session) {
          try {
            await upsertUserProfileOnServer({
              name:
                authData.user.user_metadata?.name ||
                authData.user.email?.split('@')[0],
              baseCurrency: 'USD',
            });
          } catch {
            // Do not block login on profile sync errors
          }

          setUser(authData.user);
          setSession(authData.session);
          return { error: null };
        }

        // If we reach here, something went wrong but no error was provided
        const noErrorMsg = 'Credenciales inválidas o error de conexión';
        setAuthError(noErrorMsg);
        return {
          error: {
            message: noErrorMsg,
            name: 'AuthError',
            status: 400,
          } as AuthError,
        };
      } catch (err: any) {
        const msg = err?.message || 'Error inesperado al iniciar sesión';
        setAuthError(msg);
        return { error: err as AuthError };
      }
    },
    []
  );

  /**
   * Helper function to clear all Supabase cookies
   * Used when user didn't check "remember me" to simulate temporary sessions
   */
  const clearSupabaseCookies = () => {
    if (typeof document === 'undefined') return;

    // Get all cookies and clear those starting with 'sb-'
    const cookies = document.cookie.split(';');
    cookies.forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        // Clear cookie by setting expiry to past date
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // Also try with domain if needed
        const domain = window.location.hostname;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
      }
    });
  };

  const signOut = useCallback(async () => {
    try {
      // Check if user had "remember me" preference
      const hadRememberMe =
        localStorage.getItem('fintec_remember_me') === 'true';

      // Clear any remaining local sessions
      localStorage.removeItem('fintec_session');
      sessionStorage.removeItem('fintec_session_temp');
      localStorage.removeItem('fintec_remember_me');
      clearAllOptimizedDataCaches();

      const { error } = await supabase.auth.signOut();

      // If user didn't have "remember me" checked, clear all Supabase cookies
      // to prevent automatic session restoration on next visit
      if (!hadRememberMe) {
        clearSupabaseCookies();
      }

      // Clear local state
      setUser(null);
      setSession(null);

      if (error) {
        setAuthError(error.message);
      }

      return { error };
    } catch (err: any) {
      const msg = err?.message || 'Error al cerrar sesión';
      setAuthError(msg);
      return { error: err as AuthError };
    }
  }, []);

  const updateProfile = useCallback(
    async (data: any) => {
      try {
        // Update auth user metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: data,
        });

        if (authError) return { error: authError };

        // Update user profile in database via BFF endpoint
        if (user) {
          const updateData = {
            ...data,
            updated_at: new Date().toISOString(),
          };

          try {
            await updateUserProfileOnServer(updateData);
            return { error: null };
          } catch (profileError) {
            return {
              error: {
                message: (profileError as Error).message,
                name: 'PostgrestError',
              } as PostgrestError,
            };
          }
        }

        return { error: null };
      } catch (err) {
        return { error: err as AuthError };
      }
    },
    [user]
  );
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      return { error };
    } catch (err) {
      return { error: err as AuthError };
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      setAuthError(null);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        let errorMessage = error.message;

        if (
          errorMessage.includes('rate limit') ||
          errorMessage.includes('Too many requests')
        ) {
          errorMessage =
            'Demasiados intentos. Por favor espera un momento antes de reenviar el correo.';
        } else if (errorMessage.includes('Invalid email')) {
          errorMessage = 'El formato del correo electrónico no es válido';
        }

        setAuthError(errorMessage);
      }

      return { error };
    } catch (err) {
      const msg =
        (err as Error)?.message ||
        'Error al reenviar el correo de verificación';
      setAuthError(msg);
      return { error: err as AuthError };
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * T1.3 — REQ-09: Google OAuth sign-in (web flow).
   *
   * Uses the same supabase instance as the rest of AuthContext so the PKCE
   * verifier cookie written by the browser client is consistent. (CRITICAL:
   * do NOT use a different supabase instance or the callback route's
   * exchangeCodeForSession will fail because the verifier won't match.)
   *
   * @param next - Optional post-login destination (relative path).
   */
  const signInWithGoogle = useCallback(async (next?: string) => {
    setAuthError(null);
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? '');
    const redirectTo = getOAuthRedirectTo(origin, next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'email profile',
      },
    });

    if (error) {
      setAuthError('No pudimos iniciar con Google. Intentá de nuevo.');
    }

    return { error };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      baseCurrency,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      updateProfile,
      resetPassword,
      resendVerification,
      signInWithGoogle,
    }),
    [
      user,
      session,
      loading,
      baseCurrency,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      updateProfile,
      resetPassword,
      resendVerification,
      signInWithGoogle,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

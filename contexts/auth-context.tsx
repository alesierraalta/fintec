'use client';

import React, {
  createContext,
  useContext,
  useEffect,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); // Cambiar a true para cargar sesión inicial

  // Initialize Supabase auth session
  useEffect(() => {
    // Clear any old local sessions
    localStorage.removeItem('fintec_session');
    sessionStorage.removeItem('fintec_session_temp');

    setLoading(true);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, userData?: any) => {
      try {
        setLoading(true);
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
            errorMessage = 'La contraseña debe tener al menos 6 caracteres';
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
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
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
      setLoading(true);

      // Check if user had "remember me" preference
      const hadRememberMe =
        localStorage.getItem('fintec_remember_me') === 'true';

      // Clear any remaining local sessions
      localStorage.removeItem('fintec_session');
      sessionStorage.removeItem('fintec_session_temp');
      localStorage.removeItem('fintec_remember_me');

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
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: any) => {
      try {
        setLoading(true);

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
      } finally {
        setLoading(false);
      }
    },
    [user]
  );
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      return { error };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      updateProfile,
      resetPassword,
    }),
    [
      user,
      session,
      loading,
      authError,
      clearAuthError,
      signUp,
      signIn,
      signOut,
      updateProfile,
      resetPassword,
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

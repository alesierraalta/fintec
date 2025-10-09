'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/repositories/supabase/client';

// Function to create welcome notifications for new users
const createWelcomeNotifications = async (userId: string, userName: string) => {
  try {
    const welcomeNotifications = [
      {
        user_id: userId,
        title: `¡Bienvenido/a ${userName}! 🎉`,
        message: 'Tu cuenta ha sido creada exitosamente. ¡Estás listo/a para gestionar tus finanzas de manera inteligente!',
        type: 'success' as const,
        action_url: '/profile'
      },
      {
        user_id: userId,
        title: 'Comienza tu viaje financiero 💰',
        message: 'Te recomendamos empezar creando tus primeras cuentas y categorías para organizar mejor tus finanzas.',
        type: 'info' as const,
        action_url: '/accounts'
      },
      {
        user_id: userId,
        title: 'Tutorial disponible 📚',
        message: 'Aprende a usar todas las funciones con nuestro tutorial interactivo. ¡No te pierdas ninguna característica!',
        type: 'info' as const
      }
    ];

    for (const notification of welcomeNotifications) {
      await supabase.from('notifications').insert([notification]);
    }

  } catch (error) {
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: AuthError | null; emailConfirmationRequired?: boolean }>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (data: any) => Promise<{ error: AuthError | PostgrestError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); // Cambiar a true para cargar sesión inicial

  // Initialize Supabase auth session only
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      setAuthError(null); // Clear any previous errors
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      });

      // If there's an error during signup, set it in context
      if (error) {
        let errorMessage = error.message;
        
        // Translate common errors to user-friendly Spanish messages
        if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
          errorMessage = 'Este correo ya está registrado. ¿Olvidaste tu contraseña?';
        } else if (errorMessage.includes('weak password') || errorMessage.includes('Password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        } else if (errorMessage.includes('Email address') && errorMessage.includes('is invalid')) {
          // Supabase is blocking this specific email address
          errorMessage = 'Este correo electrónico no puede ser usado para registro. Por favor usa un email corporativo o educativo válido.';
        } else if (errorMessage.includes('Invalid email')) {
          errorMessage = 'El formato del correo electrónico no es válido';
        } else if (errorMessage.includes('Email rate limit exceeded')) {
          errorMessage = 'Demasiados intentos. Por favor espera un momento e intenta de nuevo.';
        } else if (errorMessage.includes('Signup requires a valid password')) {
          errorMessage = 'La contraseña es requerida y debe ser válida';
        }
        
        setAuthError(errorMessage);
        return { error };
      }

      if (data.user) {
        // Check if the user already exists (identities array is empty)
        if (data.user.identities && data.user.identities.length === 0) {
          setAuthError('Este correo ya está registrado. ¿Olvidaste tu contraseña?');
          return { error: { message: 'Email already registered', name: 'AuthError', status: 400 } as AuthError };
        }
        
        // Check if email confirmation is required
        const emailConfirmationRequired = !data.session;
        
        // Wait a moment for the session to be established (if applicable)
        if (data.session) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create user profile in our database
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            name: userData?.full_name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          // Don't fail the registration if profile creation fails
          // The user is still registered in Supabase Auth
        } else {
          // Create welcome notifications only if session is active
          if (data.session) {
            await createWelcomeNotifications(data.user.id, userData?.full_name || data.user.email?.split('@')[0] || 'Usuario');
          }
        }
        
        return { error: null, emailConfirmationRequired };
      }

      // If we reach here, something unexpected happened
      setAuthError('Error inesperado al crear la cuenta. Por favor intenta de nuevo.');
      return { error: { message: 'Error al crear la cuenta', name: 'AuthError', status: 500 } as AuthError };
    } catch (err) {
      setAuthError('Error inesperado durante el registro. Por favor intenta de nuevo.');
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);;;

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      setAuthError(null); // Clear any previous errors
      
      // Use only Supabase Auth - no local fallback
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // If there's an authentication error, set it in context and return
      if (authError) {
        let errorMessage = authError.message;
        if (errorMessage === 'Invalid login credentials' || errorMessage.includes('Invalid')) {
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Tu email aún no ha sido confirmado. Por favor revisa tu correo y haz clic en el enlace de confirmación.';
        } else if (errorMessage.includes('Email not verified')) {
          errorMessage = 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
        } else if (errorMessage.includes('User not found')) {
          errorMessage = 'No existe una cuenta con este email. ¿Deseas registrarte?';
        }
        setAuthError(errorMessage);
        return { error: authError };
      }

      // Check if we got valid user and session data
      if (authData.user && authData.session) {
        // Create or update user profile in database
        await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0],
            base_currency: 'USD',
            updated_at: new Date().toISOString()
          });

        setUser(authData.user);
        setSession(authData.session);
        return { error: null };
      }

      // If we reach here, something went wrong but no error was provided
      return { error: { message: 'Credenciales inválidas', name: 'AuthError', status: 400 } as AuthError };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear any remaining local sessions
      localStorage.removeItem('fintec_session');
      sessionStorage.removeItem('fintec_session_temp');
      
      const { error } = await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      return { error };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    try {
      setLoading(true);
      
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: data
      });

      if (authError) return { error: authError };

      // Update user profile in database
      if (user) {
        const { error: profileError } = await supabase
          .from('users')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        return { error: profileError };
      }

      return { error: null };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, [user]);
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
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

  const value = useMemo(() => ({
    user,
    session,
    loading,
    authError,
    clearAuthError,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword
  }), [user, session, loading, authError, clearAuthError, signUp, signIn, signOut, updateProfile, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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
  const [loading, setLoading] = useState(true); // Cambiar a true para cargar sesión inicial

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {}
        }
      });

      // If there's an error during signup, return it immediately
      if (error) {
        return { error };
      }

      if (data.user) {
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
      return { error: { message: 'Error al crear la cuenta', name: 'AuthError', status: 500 } as AuthError };
    } catch (err) {
      return { error: err as AuthError };
    } finally {
      setLoading(false);
    }
  }, []);;;

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      
      // Use only Supabase Auth - no local fallback
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // If there's an authentication error, return it immediately
      if (authError) {
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
  }, []);;

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

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword
  }), [user, session, loading, signUp, signIn, signOut, updateProfile, resetPassword]);

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

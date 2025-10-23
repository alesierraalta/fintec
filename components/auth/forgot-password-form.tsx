'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Send, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const router = useRouter();
  const { resetPassword, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Por favor ingresa tu email');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un email válido');
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      setError(
        error.message === 'User not found' 
          ? 'No encontramos una cuenta con ese email.'
          : error.message
      );
    } else {
      setSuccess(true);
      onSuccess?.();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError(null);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-card rounded-3xl p-8 border border-border shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Email Enviado</h2>
            <p className="text-muted-foreground">
              Te hemos enviado un link para restablecer tu contraseña a{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">
                    Revisa tu email
                  </h3>
                  <div className="mt-2 text-sm text-primary/80">
                    <p>
                      El link de restablecimiento expira en 1 hora. Si no ves el email, 
                      revisa tu carpeta de spam.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/auth/login')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al inicio de sesión</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">¿Olvidaste tu contraseña?</h2>
          <p className="text-muted-foreground">
            Ingresa tu email y te enviaremos un link para restablecer tu contraseña
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-3"
          >
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-destructive text-sm">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={handleChange}
                className="pl-11"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #7c3aed, #a855f7)' }}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Enviar link de restablecimiento</span>
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿Recordaste tu contraseña?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-purple-600 hover:text-purple-700 font-medium"
              disabled={loading}
            >
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

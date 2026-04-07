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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="mx-auto w-full max-w-md"
      >
        <div className="rounded-[2.5rem] border border-white/10 bg-card/40 p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10"
          >
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </motion.div>

          <h2 className="mb-4 text-3xl font-black tracking-tight text-white">
            ¡Email Enviado!
          </h2>
          <p className="mb-8 leading-relaxed text-white/60">
            Te hemos enviado un link para restablecer tu contraseña a{' '}
            <span className="font-bold italic text-white">{email}</span>
          </p>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-bold text-white">
                    Revisá tu casilla
                  </h3>
                  <p className="text-xs leading-relaxed text-white/50">
                    El link de restablecimiento expira en 1 hora. Si no lo ves,
                    chequeá la carpeta de spam.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/auth/login')}
              className="flex h-14 w-full items-center justify-center space-x-2 rounded-2xl border border-white/10 bg-white/5 font-bold text-white transition-all hover:bg-white/10 active:scale-95"
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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md"
    >
      <motion.div
        layout
        className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-card/40 p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
      >
        {/* Decorative elements */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/20 blur-[80px]" />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-10 text-center"
          >
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-500 group-hover:scale-110">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-3 text-3xl font-black italic tracking-tight text-white">
              ¿Olvidaste la clave?
            </h2>
            <p className="px-4 text-sm leading-relaxed text-white/50">
              No pasa nada, a todos nos pasa. Ingresá tu email y te mandamos un
              link para que elijas una nueva.
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-center space-x-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-xs font-bold leading-tight text-red-400">
                {error}
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label
                htmlFor="email"
                className="mb-3 ml-1 block text-xs font-black uppercase tracking-widest text-white/40"
              >
                Email de tu cuenta
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
                  <Mail className="h-5 w-5 text-white/20 transition-colors group-focus-within/input:text-primary" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleChange}
                  className="h-14 rounded-2xl border-white/10 bg-white/5 pl-12 text-base text-white transition-all placeholder:text-white/20 focus:border-primary/50 focus:bg-white/10"
                  placeholder="ejemplo@email.com"
                  disabled={loading}
                />
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-base font-black text-white shadow-[0_10px_20px_-10px_rgba(124,58,237,0.5)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="border-3 h-5 w-5 animate-spin rounded-full border-white/30 border-t-white" />
                  <span className="text-sm uppercase tracking-widest">
                    Enviando...
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-sm uppercase tracking-widest">
                    Mandar Link
                  </span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center"
          >
            <p className="text-xs text-white/40">
              ¿Te acordaste?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="ml-1 font-black uppercase tracking-widest text-primary transition-colors hover:text-primary/80"
                disabled={loading}
              >
                Iniciá sesión
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

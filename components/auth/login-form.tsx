'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMobileInputAutoScroll } from '@/hooks';
import { Button, Input, Checkbox } from '@/components/ui';

interface LoginFormProps {
  onSuccess?: () => void;
}

interface EmailConfirmationMessage {
  show: boolean;
  email: string;
}

function getInitialEmailConfirmationMessage(): EmailConfirmationMessage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const isPending = sessionStorage.getItem('emailConfirmationPending');
  const pendingEmail = sessionStorage.getItem('pendingEmail');

  if (isPending === 'true' && pendingEmail) {
    return {
      show: true,
      email: pendingEmail,
    };
  }

  return null;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const { signIn, authError, clearAuthError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailConfirmationMessage] = useState<EmailConfirmationMessage | null>(
    getInitialEmailConfirmationMessage
  );

  const visibleError = authError ?? submitError;

  useEffect(() => {
    if (emailConfirmationMessage?.show) {
      sessionStorage.removeItem('emailConfirmationPending');
      sessionStorage.removeItem('pendingEmail');
    }
  }, [emailConfirmationMessage?.show]);

  const getValidationError = () => {
    const email = formData.email.trim();
    const password = formData.password;

    if (!email && !password) {
      return 'Ingresa tu email y contraseña.';
    }

    if (!email) {
      return 'El email es requerido.';
    }

    if (!password) {
      return 'La contraseña es requerida.';
    }

    return null;
  };

  // Auto-scroll global para inputs en móvil (ahora usando hook reutilizable)
  useMobileInputAutoScroll();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    clearAuthError();

    const validationError = getValidationError();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(
        formData.email.trim(),
        formData.password,
        rememberMe
      );

      if (!result.error) {
        onSuccess?.();
        router.push('/');
        return;
      }

      setSubmitError(
        'No pudimos iniciar sesión. Revisá tus datos e intentá nuevamente.'
      );
    } catch {
      setSubmitError(
        'Ocurrió un error inesperado al iniciar sesión. Intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (submitError) {
      setSubmitError(null);
    }

    // Clear error when user starts typing
    if (authError) clearAuthError();
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
          },
        },
      }}
      className="mx-auto w-full max-w-md px-4"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.95 },
          visible: { opacity: 1, y: 0, scale: 1 },
        }}
        className="black-theme-card relative overflow-hidden rounded-3xl p-8 shadow-2xl backdrop-blur-2xl"
      >
        {/* Decorative background elements */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/5 opacity-50 blur-3xl" />

        <div className="relative space-y-8">
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: { opacity: 1, scale: 1 },
            }}
            className="flex flex-col items-center justify-center space-y-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-inner ring-1 ring-primary/20">
              <LogIn className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                  Fin
                </span>
                <span className="text-primary">Tec</span>
              </h1>
              <p className="text-sm text-foreground/50">
                Tu futuro financiero comienza acá.
              </p>
            </div>
          </motion.div>

          {emailConfirmationMessage?.show && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl border-2 border-primary/20 bg-primary/5 p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Mail className="h-6 w-6 animate-pulse text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-md mb-2 font-bold text-primary">
                    📧 ¡Verifica tu correo!
                  </h3>
                  <p className="mb-3 text-xs text-foreground/70">
                    Hemos enviado un correo a:
                  </p>
                  <p className="mb-3 truncate rounded-lg border border-primary/20 bg-black/40 px-3 py-2 font-mono text-xs font-semibold text-primary/90">
                    {emailConfirmationMessage.email}
                  </p>
                  <div className="space-y-1 text-[11px] text-foreground/50">
                    <p>• Revisa tu bandeja de entrada</p>
                    <p>• Verifica la carpeta de spam</p>
                    <p className="mt-2 font-medium text-primary/80">
                      ⚠️ Confirmá tu email antes de ingresar
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {visibleError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 border-destructive/20 bg-destructive/10 p-5 shadow-2xl"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="mb-2 font-bold text-destructive">
                    {visibleError}
                  </p>
                  {visibleError.includes('confirmado') ||
                  visibleError.includes('verificar') ||
                  visibleError.includes('Email') ? (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
                      <p className="mb-2 text-sm font-medium text-primary">
                        📧 ¿No recibiste el correo?
                      </p>
                      <ul className="space-y-1 pl-4 text-[11px] text-primary/80">
                        <li>• Revisa tu carpeta de spam</li>
                        <li>• Espera unos minutos y recarga</li>
                        <li>• Verifica que el email sea correcto</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-[11px] text-warning/80">
                      <p className="mb-1 font-medium text-warning">🔍 Tips:</p>
                      <ul className="space-y-0.5 pl-2">
                        <li>• Revisa email y contraseña</li>
                        <li>• Asegura cuenta verificada</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 },
              }}
              className="space-y-4"
            >
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                icon={<Mail className="h-5 w-5" />}
                required
              />

              <div className="space-y-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  icon={<Lock className="h-5 w-5" />}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="flex h-10 w-10 items-center justify-center text-foreground/40 transition-colors hover:text-foreground/70"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              </div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
              }}
              className="flex items-center justify-between px-1"
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                  disabled={loading}
                />
                <label
                  htmlFor="remember-me"
                  className="cursor-pointer text-xs font-medium text-foreground/60 transition-colors hover:text-foreground/80"
                >
                  Recordar sesión
                </label>
              </div>
              <button
                type="button"
                onClick={() => router.push('/auth/forgot-password')}
                className="text-xs font-medium text-primary/80 underline-offset-4 transition-all hover:text-primary hover:underline"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Button
                type="submit"
                className="group relative w-full overflow-hidden shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)] transition-all duration-300"
                loading={loading}
                size="lg"
                icon={
                  !loading && (
                    <LogIn className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  )
                }
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Iniciando...' : 'Entrar'}
                </span>
                {/* Animation flash on hover */}
                <div className="absolute inset-0 z-0 translate-x-[-100%] bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 transition-transform duration-700 group-hover:translate-x-[100%]" />
              </Button>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
              }}
              className="pt-2 text-center"
            >
              <p className="text-xs text-foreground/40">
                ¿No tenés una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/register')}
                  className="font-bold text-primary underline-offset-4 transition-all hover:text-primary/80 hover:underline"
                  disabled={loading}
                >
                  Registrate ahora
                </button>
              </p>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

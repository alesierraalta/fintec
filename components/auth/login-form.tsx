'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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
  const { signIn, authError, clearAuthError, resendVerification } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailConfirmationMessage] = useState<EmailConfirmationMessage | null>(
    getInitialEmailConfirmationMessage
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (emailConfirmationMessage?.show) {
      sessionStorage.removeItem('emailConfirmationPending');
      sessionStorage.removeItem('pendingEmail');
    }
  }, [emailConfirmationMessage?.show]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!emailConfirmationMessage?.email || resendCooldown > 0) return;

    setResendSuccess(false);
    const { error } = await resendVerification(emailConfirmationMessage.email);

    if (!error) {
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 3000);
    }
  };

  // Auto-scroll global para inputs en móvil (ahora usando hook reutilizable)
  useMobileInputAutoScroll();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLoading(true);

    if (!formData.email || !formData.password) {
      // For validation errors, we can still use a local approach or set in context
      // For now keeping it simple with a check that prevents submission
      setLoading(false);
      return;
    }

    try {
      const result = await signIn(
        formData.email,
        formData.password,
        rememberMe
      );

      if (!result.error) {
        setLoading(false);
        onSuccess?.();
        router.push('/');
      } else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (authError) clearAuthError();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-md"
    >
      <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <motion.div
            className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <LogIn className="h-8 w-8 text-primary" />
          </motion.div>
          <h2 className="mb-2 text-3xl font-bold text-foreground text-primary">
            Iniciar Sesión
          </h2>
          <p className="text-muted-foreground">
            Accede a tu cuenta para continuar
          </p>
        </div>

        {emailConfirmationMessage?.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border-2 border-primary/20 bg-primary/10 p-6"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-bold text-primary">
                  📧 ¡Verifica tu correo electrónico!
                </h3>
                <p className="mb-3 text-primary/80">
                  Hemos enviado un correo de confirmación a:
                </p>
                <p className="mb-3 rounded-lg bg-card px-3 py-2 font-semibold text-primary">
                  {emailConfirmationMessage.email}
                </p>
                <div className="space-y-2 text-sm text-primary/70">
                  <p>✅ Revisa tu bandeja de entrada</p>
                  <p>✅ Verifica la carpeta de spam si no lo encuentras</p>
                  <p>✅ Haz clic en el enlace de verificación</p>
                  <p className="mt-3 font-medium text-primary">
                    ⚠️ No podrás iniciar sesión hasta que confirmes tu email
                  </p>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                  className="mt-4 flex w-full items-center justify-center space-x-2 rounded-lg border border-primary/30 px-4 py-2 text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${resendCooldown > 0 ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {resendSuccess
                      ? '¡Correo reenviado!'
                      : resendCooldown > 0
                        ? `Reenviar en ${resendCooldown}s`
                        : 'Reenviar correo de verificación'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {authError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-xl border-2 border-destructive/20 bg-destructive/10 p-5"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="mb-2 font-semibold text-destructive">
                  {authError}
                </p>
                {authError.includes('confirmado') ||
                authError.includes('verificar') ||
                authError.includes('Email') ? (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
                    <p className="mb-2 text-sm font-medium text-primary">
                      📧 ¿No recibiste el correo de verificación?
                    </p>
                    <ul className="space-y-1 pl-4 text-sm text-primary/80">
                      <li>• Revisa tu carpeta de spam</li>
                      <li>• Espera unos minutos y recarga tu bandeja</li>
                      <li>
                        • Verifica que escribiste bien tu email al registrarte
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3">
                    <p className="mb-2 text-sm font-medium text-warning">
                      🔍 ¿Problemas para iniciar sesión?
                    </p>
                    <ul className="space-y-1 pl-4 text-sm text-warning/80">
                      <li>
                        • Verifica que tu email y contraseña sean correctos
                      </li>
                      <li>• Asegúrate de que tu cuenta esté verificada</li>
                      <li>
                        • Si olvidaste tu contraseña, usa &quot;¿Olvidaste tu
                        contraseña?&quot;
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus={false}
                required
                value={formData.email}
                onChange={handleChange}
                className="pl-11"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus={false}
                required
                value={formData.password}
                onChange={handleChange}
                className="pl-11 pr-11"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus-ring absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked)}
                disabled={loading}
              />
              <label
                htmlFor="remember-me"
                className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Recordar sesión
              </label>
            </div>
            <button
              type="button"
              onClick={() => router.push('/auth/forgot-password')}
              className="text-sm font-medium text-primary hover:text-primary/80"
              disabled={loading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
            icon={!loading && <LogIn className="h-5 w-5" />}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="font-semibold text-primary transition-all hover:text-primary/80"
              disabled={loading}
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

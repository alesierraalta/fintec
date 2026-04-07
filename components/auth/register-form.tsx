'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input } from '@/components/ui';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const router = useRouter();
  const { signUp, loading, authError, clearAuthError } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    type: 'emailVerification' | 'accountCreated';
    email?: string;
  } | null>(null);

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setValidationError('El nombre completo es requerido');
      return false;
    }
    if (!formData.email) {
      setValidationError('El email es requerido');
      return false;
    }
    if (formData.password.length < 6) {
      setValidationError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearAuthError();

    if (!validateForm()) return;

    const { error, emailConfirmationRequired } = await signUp(
      formData.email,
      formData.password,
      {
        full_name: formData.fullName,
      }
    );

    if (!error) {
      // If email confirmation is required, show success message and redirect to login
      if (emailConfirmationRequired) {
        setSuccess(true);
        setSuccessMessage({
          type: 'emailVerification',
          email: formData.email,
        });

        // Store in session for login page
        sessionStorage.setItem('emailConfirmationPending', 'true');
        sessionStorage.setItem('pendingEmail', formData.email);

        // Redirect after 5 seconds to give time to read
        setTimeout(() => {
          router.push('/auth/login');
        }, 5000);
      } else {
        // If no confirmation required, show success and redirect to dashboard
        setSuccess(true);
        setSuccessMessage({
          type: 'accountCreated',
        });
        setTimeout(() => {
          onSuccess?.();
          router.push('/');
        }, 2000);
      }
    }
    // Errors are now handled by authError from context
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (validationError) setValidationError(null);
    if (authError) clearAuthError();
  };
  if (success) {
    if (successMessage?.type === 'emailVerification') {
      return (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1 },
          }}
          className="mx-auto w-full max-w-md px-4"
        >
          <div className="black-theme-card relative overflow-hidden rounded-3xl p-8 text-center shadow-2xl backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 shadow-inner ring-1 ring-primary/20"
            >
              <Mail className="h-12 w-12 animate-pulse text-primary" />
            </motion.div>

            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white">
              📧 <span className="italic text-primary">Revisá</span> tu Correo
            </h2>

            <div className="mb-8 space-y-6">
              <p className="text-sm text-white/50">
                Enviamos un enlace mágico de verificación a:
              </p>
              <div className="mx-auto max-w-[280px] rounded-xl border border-primary/20 bg-black/40 px-4 py-3 font-mono text-xs font-semibold text-primary/90 shadow-inner">
                {successMessage.email}
              </div>

              <div className="glass-card space-y-3 rounded-2xl border border-white/5 bg-white/5 p-6 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-primary/80">
                  Próximos pasos:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-xs text-white/70">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Revisá tu bandeja de entrada</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-white/70">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Chequeá la carpeta de Spam</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-white/70">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Confirmá el enlace para entrar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 text-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs font-medium">
                  Redirigiendo al login en 5 segundos...
                </span>
              </div>

              <Button
                onClick={() => router.push('/auth/login')}
                variant="ghost"
                className="w-full text-white/60 hover:text-primary"
              >
                Ir al login ahora →
              </Button>
            </div>
          </div>
        </motion.div>
      );
    } else {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-md px-4"
        >
          <div className="black-theme-card rounded-3xl p-10 text-center shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 shadow-inner ring-1 ring-green-500/20"
            >
              <CheckCircle className="h-10 w-10 text-green-500" />
            </motion.div>
            <h2 className="mb-2 text-3xl font-bold text-white">
              ¡Cuenta Creada!
            </h2>
            <p className="mb-8 text-sm text-white/50">
              Bienvenido a la familia. Estamos preparando todo para vos.
            </p>
            <div className="flex flex-col items-center gap-4">
              <div className="h-2 w-48 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'linear',
                  }}
                  className="h-full w-full bg-gradient-to-r from-transparent via-green-500 to-transparent"
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">
                Cargando tu experiencia
              </span>
            </div>
          </div>
        </motion.div>
      );
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
      className="mx-auto w-full max-w-md px-4"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="black-theme-card relative overflow-hidden rounded-3xl p-8 shadow-2xl backdrop-blur-2xl"
      >
        {/* Decorative elements */}
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative space-y-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-inner ring-1 ring-primary/20">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-3xl">
                Unite a <span className="italic text-primary">FinTec</span>
              </h1>
              <p className="text-sm text-white/50">
                Simple, rápido y potente. Gestioná tu dinero como un
                profesional.
              </p>
            </div>
          </div>

          {(validationError || authError) && (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
              role="alert"
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive/80" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive-foreground/90">
                    {validationError || authError}
                  </p>
                  {authError && authError.includes('registrado') && (
                    <button
                      onClick={() => router.push('/auth/login')}
                      className="text-xs font-bold text-destructive hover:underline"
                    >
                      💡 Ya tengo cuenta, quiero iniciar sesión
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 },
              }}
              className="space-y-4"
            >
              <Input
                id="fullName"
                name="fullName"
                label="Nombre Completo"
                placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={handleChange}
                disabled={loading}
                icon={<User className="h-5 w-5" />}
                required
              />

              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                placeholder="juan@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                icon={<Mail className="h-5 w-5" />}
                required
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  placeholder="••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  icon={<Lock className="h-5 w-5" />}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="mr-2 text-white/30 transition-colors hover:text-white/60"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmar"
                  placeholder="••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  icon={<Lock className="h-5 w-5" />}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="mr-2 text-white/30 transition-colors hover:text-white/60"
                    >
                      {showConfirmPassword ? (
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
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              className="pt-2"
            >
              <Button
                type="submit"
                className="group relative w-full overflow-hidden shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)] transition-all duration-300"
                loading={loading}
                size="lg"
                icon={
                  !loading && (
                    <UserPlus className="h-5 w-5 transition-transform group-hover:scale-110" />
                  )
                }
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Creando cuenta...' : 'Registrarme'}
                </span>
                <div className="absolute inset-0 z-0 translate-x-[-100%] bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 transition-transform duration-700 group-hover:translate-x-[100%]" />
              </Button>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
              }}
              className="pt-4 text-center"
            >
              <p className="text-xs text-white/40">
                ¿Ya sos parte?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="font-bold text-primary underline-offset-4 transition-all hover:text-primary/80 hover:underline"
                  disabled={loading}
                >
                  Iniciá sesión
                </button>
              </p>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

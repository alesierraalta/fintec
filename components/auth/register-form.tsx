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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl">
            <motion.div
              className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Mail className="h-10 w-10 text-primary" />
            </motion.div>

            <h2 className="mb-4 text-center text-3xl font-bold text-primary">
              📧 ¡Revisa tu Correo!
            </h2>

            <div className="mb-6 space-y-4">
              <p className="text-center text-foreground">
                Hemos enviado un correo de verificación a:
              </p>
              <p className="rounded-lg bg-primary/10 px-4 py-3 text-center text-lg font-bold text-primary">
                {successMessage.email}
              </p>

              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm font-semibold text-primary">
                  ⚠️ Importante:
                </p>
                <ul className="space-y-1 pl-4 text-sm text-primary/80">
                  <li>✅ Revisa tu bandeja de entrada</li>
                  <li>✅ Verifica la carpeta de spam</li>
                  <li>✅ Haz clic en el enlace de verificación</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-primary">
                  No podrás iniciar sesión hasta confirmar tu email
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">
                Redirigiendo al login en 5 segundos...
              </span>
            </div>

            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 w-full text-sm font-medium text-primary hover:text-primary/80"
            >
              Ir al login ahora →
            </button>
          </div>
        </motion.div>
      );
    } else {
      // Account created without email verification
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-3xl border border-border/20 bg-card/50 p-8 text-center shadow-2xl backdrop-blur-sm">
            <motion.div
              className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <CheckCircle className="h-8 w-8 text-success" />
            </motion.div>
            <h2 className="mb-2 bg-gradient-to-r from-success to-green-500 bg-clip-text text-3xl font-bold text-foreground text-transparent">
              ¡Cuenta Creada!
            </h2>
            <p className="mb-4 text-muted-foreground">
              Tu cuenta ha sido creada exitosamente. Serás redirigido
              automáticamente.
            </p>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-success border-t-transparent" />
          </div>
        </motion.div>
      );
    }
  }

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
            className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10"
            whileHover={{ scale: 1.05, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <UserPlus className="h-8 w-8 text-success" />
          </motion.div>
          <h2 className="mb-2 bg-gradient-to-r from-success to-green-500 bg-clip-text text-3xl font-bold text-foreground text-transparent">
            Crear Cuenta
          </h2>
          <p className="text-muted-foreground">
            Únete para gestionar tus finanzas
          </p>
        </div>

        {(validationError || authError) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex items-start space-x-3 rounded-lg border border-error/20 bg-error/10 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-error" />
            <div className="flex-1">
              <p className="text-sm text-error">
                {validationError || authError}
              </p>
              {authError && authError.includes('registrado') && (
                <p className="mt-2 text-xs text-error/80">
                  💡 Si ya tienes una cuenta, puedes{' '}
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="underline hover:text-error"
                  >
                    iniciar sesión aquí
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="pl-11"
                placeholder="Tu nombre completo"
                disabled={loading}
              />
            </div>
          </div>

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
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo 6 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-11 pr-11"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="focus-ring absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="success"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
            icon={!loading && <UserPlus className="h-5 w-5" />}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="font-semibold text-primary transition-all hover:text-primary/80"
              disabled={loading}
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

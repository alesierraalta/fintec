'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input } from '@/components/ui';
import { GradientCard } from '@/components/ui/elegant-gradient';

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
    confirmPassword: ''
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

    const { error, emailConfirmationRequired } = await signUp(formData.email, formData.password, {
      full_name: formData.fullName
    });

    if (!error) {
      // If email confirmation is required, show success message and redirect to login
      if (emailConfirmationRequired) {
        setSuccess(true);
        setSuccessMessage({
          type: 'emailVerification',
          email: formData.email
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
          type: 'accountCreated'
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
          className="w-full max-w-md mx-auto"
        >
          <div className="bg-card rounded-3xl p-8 border border-border shadow-2xl">
            <motion.div 
              className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6 mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Mail className="h-10 w-10 text-primary" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-center mb-4 text-primary">
              📧 ¡Revisa tu Correo!
            </h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-center text-foreground">
                Hemos enviado un correo de verificación a:
              </p>
              <p className="text-center font-bold text-lg text-primary bg-primary/10 px-4 py-3 rounded-lg">
                {successMessage.email}
              </p>
              
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-primary">
                  ⚠️ Importante:
                </p>
                <ul className="text-sm text-primary/80 space-y-1 pl-4">
                  <li>✅ Revisa tu bandeja de entrada</li>
                  <li>✅ Verifica la carpeta de spam</li>
                  <li>✅ Haz clic en el enlace de verificación</li>
                </ul>
                <p className="text-sm font-medium text-primary mt-3">
                  No podrás iniciar sesión hasta confirmar tu email
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Redirigiendo al login en 5 segundos...</span>
            </div>
            
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 w-full text-sm text-primary hover:text-primary/80 font-medium"
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
          className="w-full max-w-md mx-auto"
        >
          <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 border border-border/20 shadow-2xl text-center">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-2xl mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="h-8 w-8 text-success" />
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-success to-green-500 bg-clip-text text-transparent">
              ¡Cuenta Creada!
            </h2>
            <p className="text-muted-foreground mb-4">
              Tu cuenta ha sido creada exitosamente. Serás redirigido automáticamente.
            </p>
            <div className="w-8 h-8 border-2 border-success border-t-transparent rounded-full animate-spin mx-auto" />
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
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-card rounded-3xl p-8 border border-border shadow-2xl">
        <div className="text-center mb-8">
          <motion.div 
            className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-2xl mb-4"
            whileHover={{ scale: 1.05, rotate: -5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <UserPlus className="h-8 w-8 text-success" />
          </motion.div>
          <h2 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-success to-green-500 bg-clip-text text-transparent">
            Crear Cuenta
          </h2>
          <p className="text-muted-foreground">Únete para gestionar tus finanzas</p>
        </div>

        {(validationError || authError) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start space-x-3"
          >
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-error text-sm">{validationError || authError}</p>
              {authError && authError.includes('registrado') && (
                <p className="text-error/80 text-xs mt-2">
                  💡 Si ya tienes una cuenta, puedes <button 
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
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                value={formData.email}
                onChange={handleChange}
                className="pl-11"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
              className="text-primary hover:text-primary/80 font-semibold transition-all"
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




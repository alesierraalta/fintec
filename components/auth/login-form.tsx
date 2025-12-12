'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button, Input } from '@/components/ui';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const { signIn, authError, clearAuthError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailConfirmationMessage, setEmailConfirmationMessage] = useState<{
    show: boolean;
    email: string;
  } | null>(null);

  useEffect(() => {
    // Check if user was just redirected from registration
    const isPending = sessionStorage.getItem('emailConfirmationPending');
    const pendingEmail = sessionStorage.getItem('pendingEmail');
    
    if (isPending === 'true' && pendingEmail) {
      setEmailConfirmationMessage({
        show: true,
        email: pendingEmail
      });
      // Clear session storage after reading
      sessionStorage.removeItem('emailConfirmationPending');
      sessionStorage.removeItem('pendingEmail');
    }
  }, []);

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
      const result = await signIn(formData.email, formData.password, rememberMe);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (authError) clearAuthError();
  };

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
            className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <LogIn className="h-8 w-8 text-primary" />
          </motion.div>
          <h2 className="text-3xl font-bold text-foreground mb-2 text-primary">
            Iniciar Sesión
          </h2>
          <p className="text-muted-foreground">Accede a tu cuenta para continuar</p>
        </div>

        {emailConfirmationMessage?.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-primary/10 border-2 border-primary/20 rounded-2xl"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary mb-2">
                  📧 ¡Verifica tu correo electrónico!
                </h3>
                <p className="text-primary/80 mb-3">
                  Hemos enviado un correo de confirmación a:
                </p>
                <p className="text-primary font-semibold mb-3 bg-card px-3 py-2 rounded-lg">
                  {emailConfirmationMessage.email}
                </p>
                <div className="space-y-2 text-sm text-primary/70">
                  <p>✅ Revisa tu bandeja de entrada</p>
                  <p>✅ Verifica la carpeta de spam si no lo encuentras</p>
                  <p>✅ Haz clic en el enlace de verificación</p>
                  <p className="font-medium mt-3 text-primary">
                    ⚠️ No podrás iniciar sesión hasta que confirmes tu email
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {authError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-5 bg-destructive/10 border-2 border-destructive/20 rounded-xl"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-destructive font-semibold mb-2">{authError}</p>
                {authError.includes('confirmado') || authError.includes('verificar') || authError.includes('Email') ? (
                  <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-primary text-sm font-medium mb-2">
                      📧 ¿No recibiste el correo de verificación?
                    </p>
                    <ul className="text-primary/80 text-sm space-y-1 pl-4">
                      <li>• Revisa tu carpeta de spam</li>
                      <li>• Espera unos minutos y recarga tu bandeja</li>
                      <li>• Verifica que escribiste bien tu email al registrarte</li>
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-warning text-sm font-medium mb-2">
                      🔍 ¿Problemas para iniciar sesión?
                    </p>
                    <ul className="text-warning/80 text-sm space-y-1 pl-4">
                      <li>• Verifica que tu email y contraseña sean correctos</li>
                      <li>• Asegúrate de que tu cuenta esté verificada</li>
                      <li>• Si olvidaste tu contraseña, usa &quot;¿Olvidaste tu contraseña?&quot;</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                disabled={loading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                Recordar sesión
              </label>
            </div>
            <button
              type="button"
              onClick={() => router.push('/auth/forgot-password')}
              className="text-sm text-primary hover:text-primary/80 font-medium"
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
              className="text-primary font-semibold hover:text-primary/80 transition-all"
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



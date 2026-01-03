'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, updateProfile, loading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage(null);

    const { error } = await updateProfile({
      full_name: formData.full_name
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
      setIsEditing(false);
    }

    setUpdateLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* iOS-style Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-ios-caption font-medium">Cuenta</span>
            </div>

            <div className="w-24 h-24 bg-gradient-to-r from-primary to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>

            <h1 className="text-ios-large-title font-bold mb-4 tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-purple-500 bg-clip-text text-transparent">
              👤 Mi Perfil
            </h1>
            <p className="text-muted-foreground font-light mb-6">
              Gestiona tu información personal
            </p>
          </div>

          {/* iOS-style Profile Information */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-8 border border-border/40 shadow-lg">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Información Personal</h2>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                  <Settings className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-ios-body text-muted-foreground">Edita tu perfil y datos personales</p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-ios-caption"
                >
                  <span>Editar</span>
                </button>
              )}
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
                  }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {message.text}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="pl-11 bg-gray-50"
                      placeholder="Tu nombre completo"
                      disabled={!isEditing || updateLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      className="pl-11 bg-gray-50"
                      disabled={true}
                      placeholder="Email no editable"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    El email no se puede modificar
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la Cuenta</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Registro
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={new Date(user.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        className="pl-11 bg-gray-50"
                        disabled={true}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID de Usuario
                    </label>
                    <Input
                      type="text"
                      value={user.id}
                      className="bg-gray-50 font-mono text-xs"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setMessage(null);
                      // Reset form data
                      setFormData({
                        full_name: user.user_metadata?.full_name || '',
                        email: user.email || ''
                      });
                    }}
                    disabled={updateLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLoading}
                  >
                    {updateLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Guardar Cambios</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}




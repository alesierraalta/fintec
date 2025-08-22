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
        >
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-gray-500" />
                <h2 className="text-xl font-semibold text-gray-900">Información Personal</h2>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Editar
                </Button>
              )}
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-700' : 'text-red-700'
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
                      className="pl-11"
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
                    variant="outline"
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




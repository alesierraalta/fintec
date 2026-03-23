'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  return <ProfileContent />;
}

function ProfileContent() {
  const { user, updateProfile, loading } = useAuth();
  const [draftFormData, setDraftFormData] = useState({
    full_name: '',
    email: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const userFormData = useMemo(
    () => ({
      full_name: user?.user_metadata?.full_name || '',
      email: user?.email || '',
    }),
    [user]
  );

  const formData = isEditing ? draftFormData : userFormData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage(null);

    const { error } = await updateProfile({
      full_name: formData.full_name,
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
    setDraftFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* iOS-style Header */}
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></div>
              <span className="text-ios-caption font-medium">Cuenta</span>
            </div>

            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-primary to-indigo-600 shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>

            <h1 className="mb-4 text-ios-large-title font-bold tracking-tight">
              <span className="mr-2">👤</span>
              <span className="bg-gradient-to-r from-primary via-indigo-600 to-purple-500 bg-clip-text text-transparent">
                Mi Perfil
              </span>
            </h1>
            <p className="mb-6 font-light text-muted-foreground">
              Gestiona tu información personal
            </p>
          </div>

          {/* iOS-style Profile Information */}
          <div className="rounded-3xl border border-border/40 bg-card/90 p-8 shadow-lg backdrop-blur-xl">
            <div className="mb-8 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"></div>
              <h2 className="text-ios-title font-semibold text-foreground">
                Información Personal
              </h2>
            </div>

            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="rounded-2xl bg-indigo-500/10 p-3">
                  <Settings className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-ios-body text-muted-foreground">
                    Edita tu perfil y datos personales
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => {
                    setDraftFormData(userFormData);
                    setIsEditing(true);
                  }}
                  className="flex items-center space-x-2 rounded-xl bg-primary/10 px-4 py-2 text-ios-caption font-medium text-primary transition-all duration-200 hover:bg-primary/20"
                >
                  <span>Editar</span>
                </button>
              )}
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mb-6 flex items-center space-x-3 rounded-lg p-4 ${
                  message.type === 'success'
                    ? 'border border-green-200 bg-green-50'
                    : 'border border-red-200 bg-red-50'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                )}
                <p
                  className={`text-sm ${
                    message.type === 'success'
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  {message.text}
                </p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Nombre Completo"
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={!isEditing || updateLoading}
                  placeholder="Tu nombre completo"
                  className="input-force-visible"
                  icon={<User className="h-5 w-5" />}
                />

                <div>
                  <Input
                    label="Email"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled={true}
                    className="input-force-visible bg-muted/50"
                    icon={<Mail className="h-5 w-5" />}
                  />
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                    <AlertCircle className="h-3 w-3" />
                    No editable
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="mb-4 text-lg font-medium text-gray-900">
                  Información de la Cuenta
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label="Fecha de Registro"
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString(
                      'es-ES',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                    disabled={true}
                    className="input-force-visible bg-muted/50"
                    icon={<Calendar className="h-5 w-5" />}
                  />

                  <Input
                    label="ID de Usuario"
                    type="text"
                    value={user.id}
                    className="input-force-visible bg-muted/50 font-mono text-xs"
                    disabled={true}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end space-x-4 border-t border-gray-200 pt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setMessage(null);
                      setDraftFormData(userFormData);
                    }}
                    disabled={updateLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateLoading}>
                    {updateLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

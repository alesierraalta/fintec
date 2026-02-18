'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui';
import { useAutoBackup } from '@/hooks/use-auto-backup';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Shield,
  Clock,
  Download,
  Bell,
  Smartphone,
  Moon,
  Sun,
  Globe,
  Database,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings, performAutoBackup, isBackupDue } =
    useAutoBackup();
  const { tier, isPremium } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    updateSettings({ frequency });
  };

  const handleToggleAutoBackup = () => {
    updateSettings({ enabled: !settings.enabled });
  };

  const handleToggleAutoDownload = () => {
    updateSettings({ autoDownload: !settings.autoDownload });
  };

  const handleManualBackup = async () => {
    setLoading(true);
    try {
      await performAutoBackup();
      toast.success('Backup manual completado exitosamente');
    } catch (error) {
      toast.error('Error al realizar el backup manual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <MainLayout>
        <div className="animate-fade-in space-y-8">
          {/* iOS-style Header */}
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
              <span className="text-ios-caption font-medium">Sistema</span>
            </div>

            <h1 className="mb-6 bg-gradient-to-r from-primary via-purple-600 to-indigo-500 bg-clip-text text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl">
              ⚙️ Configuración
            </h1>
            <p className="mb-6 font-light text-muted-foreground">
              Personaliza tu experiencia y configuraciones
            </p>
          </div>

          {/* * Subscription Section */}
          <div
            className={`mb-6 rounded-3xl border bg-card/90 p-6 shadow-lg backdrop-blur-xl ${
              isPremium ? 'border-amber-400/40' : 'border-border/40'
            }`}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 animate-pulse rounded-full ${
                    isPremium ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                ></div>
                <h2 className="text-ios-title font-semibold text-foreground">
                  Suscripción
                </h2>
              </div>
              {isPremium && (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">
                    Activo
                  </span>
                </div>
              )}
            </div>

            <div className="mb-6 flex items-center space-x-4">
              <div
                className={`rounded-2xl p-3 ${
                  isPremium ? 'bg-amber-500/10' : 'bg-blue-500/10'
                }`}
              >
                <Crown
                  className={`h-6 w-6 ${
                    isPremium ? 'text-amber-400' : 'text-blue-600'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-ios-body font-semibold text-foreground">
                    Plan:{' '}
                    {tier === 'free'
                      ? 'Gratis'
                      : tier === 'base'
                        ? 'Base'
                        : 'Premium'}
                  </p>
                  {isPremium && <Crown className="h-4 w-4 text-amber-400" />}
                </div>
                <p className="mt-1 text-ios-caption text-muted-foreground">
                  {isPremium
                    ? 'Disfruta de todas las funciones premium'
                    : 'Actualiza para desbloquear más funciones'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-ios-body font-medium text-foreground">
                    Estado
                  </p>
                  <p className="mt-1 text-ios-caption text-muted-foreground">
                    {isPremium ? 'Suscripción activa' : 'Sin suscripción'}
                  </p>
                </div>
                <Link href="/pricing">
                  <Button
                    variant={isPremium ? 'outline' : 'primary'}
                    size="sm"
                    className={
                      isPremium
                        ? 'border-amber-400/30 text-amber-400 hover:bg-amber-500/10'
                        : ''
                    }
                  >
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* iOS-style Auto Backup Settings */}
            <div className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl">
              <div className="mb-6 flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                <h2 className="text-ios-title font-semibold text-foreground">
                  Respaldo Automático
                </h2>
              </div>

              <div className="mb-6 flex items-center space-x-4">
                <div className="rounded-2xl bg-blue-500/10 p-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-ios-body text-muted-foreground">
                    Configura respaldos automáticos de tus datos
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* iOS-style Enable/Disable */}
                <div className="rounded-2xl bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ios-body font-medium text-foreground">
                        Activar respaldo automático
                      </p>
                      <p className="mt-1 text-ios-caption text-muted-foreground">
                        Crear respaldos según la frecuencia configurada
                      </p>
                    </div>
                    <button
                      onClick={handleToggleAutoBackup}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full shadow-inner transition-all duration-300 ${
                        settings.enabled
                          ? 'bg-primary shadow-primary/30'
                          : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          settings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Frequency */}
                {settings.enabled && (
                  <div>
                    <p className="mb-3 text-sm font-medium text-white">
                      Frecuencia
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'daily', label: 'Diario', icon: Sun },
                        { value: 'weekly', label: 'Semanal', icon: Clock },
                        { value: 'monthly', label: 'Mensual', icon: Moon },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() =>
                            handleFrequencyChange(option.value as any)
                          }
                          className={`rounded-lg border p-3 text-sm transition-colors ${
                            settings.frequency === option.value
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          <option.icon className="mx-auto mb-1 h-4 w-4" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto Download */}
                {settings.enabled && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Descarga automática
                      </p>
                      <p className="text-xs text-gray-400">
                        Descargar archivo al realizar respaldo
                      </p>
                    </div>
                    <button
                      onClick={handleToggleAutoDownload}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoDownload ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.autoDownload
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Status */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Estado</p>
                      <p className="text-xs text-gray-500">
                        {settings.lastBackup
                          ? `Último: ${new Date(settings.lastBackup).toLocaleDateString('es-ES')}`
                          : 'Sin respaldos previos'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isBackupDue && (
                        <span className="rounded bg-orange-500/20 px-2 py-1 text-xs text-orange-400">
                          Pendiente
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={handleManualBackup}
                        disabled={loading}
                        icon={
                          loading ? undefined : <Download className="h-4 w-4" />
                        }
                      >
                        {loading ? 'Creando...' : 'Backup Manual'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Settings */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-6 flex items-center space-x-3">
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <Bell className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Notificaciones
                  </h3>
                  <p className="text-sm text-gray-400">
                    Configura las alertas y notificaciones
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="py-8 text-center">
                  <Bell className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                  <p className="mb-2 text-sm text-gray-400">
                    Configuración de notificaciones
                  </p>
                  <p className="text-xs text-gray-500">
                    Próximamente disponible
                  </p>
                </div>
              </div>
            </div>

            {/* App Settings */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-6 flex items-center space-x-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Smartphone className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Aplicación
                  </h3>
                  <p className="text-sm text-gray-400">
                    Configuraciones generales de la app
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="py-8 text-center">
                  <Smartphone className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                  <p className="mb-2 text-sm text-gray-400">
                    Configuraciones de la aplicación
                  </p>
                  <p className="text-xs text-gray-500">
                    Próximamente disponible
                  </p>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-6 flex items-center space-x-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <Database className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Gestión de Datos
                  </h3>
                  <p className="text-sm text-gray-400">
                    Administra tus datos y privacidad
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="py-8 text-center">
                  <Database className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                  <p className="mb-2 text-sm text-gray-400">
                    Gestión y privacidad de datos
                  </p>
                  <p className="text-xs text-gray-500">
                    Próximamente disponible
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <h3 className="mb-2 text-sm font-medium text-blue-400">
              💡 Acerca de los Respaldos Automáticos
            </h3>
            <ul className="space-y-1 text-sm text-blue-300">
              <li>
                • Los respaldos se crean automáticamente según la frecuencia
                configurada
              </li>
              <li>
                • Los datos se mantienen seguros y privados en tu dispositivo
              </li>
              <li>
                • Puedes descargar manualmente en cualquier momento desde la
                sección Respaldos
              </li>
              <li>
                • Se requieren permisos de notificación para alertas de respaldo
              </li>
            </ul>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

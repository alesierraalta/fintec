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
  Crown
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, performAutoBackup, isBackupDue } = useAutoBackup();
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
      alert('Backup manual completado exitosamente');
    } catch (error) {
      alert('Error al realizar el backup manual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-8 animate-fade-in">
          {/* iOS-style Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-ios-caption font-medium">Sistema</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-purple-600 to-indigo-500 bg-clip-text text-white">
              ⚙️ Configuración
            </h1>
            <p className="text-muted-foreground font-light mb-6">
              Personaliza tu experiencia y configuraciones
            </p>
          </div>

          {/* * Subscription Section */}
          <div className={`bg-card/90 backdrop-blur-xl rounded-3xl p-6 border shadow-lg mb-6 ${isPremium ? 'border-amber-400/40' : 'border-border/40'
            }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isPremium ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></div>
                <h2 className="text-ios-title font-semibold text-foreground">Suscripción</h2>
              </div>
              {isPremium && (
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-400/30 rounded-full flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Activo</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className={`p-3 rounded-2xl ${isPremium ? 'bg-amber-500/10' : 'bg-blue-500/10'
                }`}>
                <Crown className={`h-6 w-6 ${isPremium ? 'text-amber-400' : 'text-blue-600'
                  }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-ios-body font-semibold text-foreground">
                    Plan: {tier === 'free' ? 'Gratis' : tier === 'base' ? 'Base' : 'Premium'}
                  </p>
                  {isPremium && (
                    <Crown className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <p className="text-ios-caption text-muted-foreground mt-1">
                  {isPremium
                    ? 'Disfruta de todas las funciones premium'
                    : 'Actualiza para desbloquear más funciones'}
                </p>
              </div>
            </div>

            <div className="bg-muted/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-ios-body font-medium text-foreground">Estado</p>
                  <p className="text-ios-caption text-muted-foreground mt-1">
                    {isPremium ? 'Suscripción activa' : 'Sin suscripción'}
                  </p>
                </div>
                <Link href="/pricing">
                  <Button
                    variant={isPremium ? 'outline' : 'primary'}
                    size="sm"
                    className={isPremium ? 'border-amber-400/30 text-amber-400 hover:bg-amber-500/10' : ''}
                  >
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* iOS-style Auto Backup Settings */}
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <h2 className="text-ios-title font-semibold text-foreground">Respaldo Automático</h2>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-ios-body text-muted-foreground">Configura respaldos automáticos de tus datos</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* iOS-style Enable/Disable */}
                <div className="bg-muted/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-ios-body font-medium text-foreground">Activar respaldo automático</p>
                      <p className="text-ios-caption text-muted-foreground mt-1">Crear respaldos según la frecuencia configurada</p>
                    </div>
                    <button
                      onClick={handleToggleAutoBackup}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shadow-inner ${settings.enabled ? 'bg-primary shadow-primary/30' : 'bg-muted'
                        }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-md ${settings.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Frequency */}
                {settings.enabled && (
                  <div>
                    <p className="text-sm font-medium text-white mb-3">Frecuencia</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'daily', label: 'Diario', icon: Sun },
                        { value: 'weekly', label: 'Semanal', icon: Clock },
                        { value: 'monthly', label: 'Mensual', icon: Moon },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleFrequencyChange(option.value as any)}
                          className={`p-3 rounded-lg border text-sm transition-colors ${settings.frequency === option.value
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                          <option.icon className="h-4 w-4 mx-auto mb-1" />
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
                      <p className="text-sm font-medium text-white">Descarga automática</p>
                      <p className="text-xs text-gray-400">Descargar archivo al realizar respaldo</p>
                    </div>
                    <button
                      onClick={handleToggleAutoDownload}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoDownload ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoDownload ? 'translate-x-6' : 'translate-x-1'
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
                          : 'Sin respaldos previos'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isBackupDue && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                          Pendiente
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={handleManualBackup}
                        disabled={loading}
                        icon={loading ? undefined : <Download className="h-4 w-4" />}
                      >
                        {loading ? 'Creando...' : 'Backup Manual'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Settings */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Bell className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
                  <p className="text-sm text-gray-400">Configura las alertas y notificaciones</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-2">Configuración de notificaciones</p>
                  <p className="text-xs text-gray-500">Próximamente disponible</p>
                </div>
              </div>
            </div>

            {/* App Settings */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Aplicación</h3>
                  <p className="text-sm text-gray-400">Configuraciones generales de la app</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-2">Configuraciones de la aplicación</p>
                  <p className="text-xs text-gray-500">Próximamente disponible</p>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Database className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Gestión de Datos</h3>
                  <p className="text-sm text-gray-400">Administra tus datos y privacidad</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-2">Gestión y privacidad de datos</p>
                  <p className="text-xs text-gray-500">Próximamente disponible</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-2">💡 Acerca de los Respaldos Automáticos</h3>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Los respaldos se crean automáticamente según la frecuencia configurada</li>
              <li>• Los datos se mantienen seguros y privados en tu dispositivo</li>
              <li>• Puedes descargar manualmente en cualquier momento desde la sección Respaldos</li>
              <li>• Se requieren permisos de notificación para alertas de respaldo</li>
            </ul>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

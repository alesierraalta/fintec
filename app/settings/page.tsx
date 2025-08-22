'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui';
import { useAutoBackup } from '@/hooks/use-auto-backup';
import { 
  Shield, 
  Clock, 
  Download, 
  Bell,
  Smartphone,
  Moon,
  Sun,
  Globe,
  Database
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, performAutoBackup, isBackupDue } = useAutoBackup();
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
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
            <p className="text-gray-400">Personaliza tu experiencia y configuraciones</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Auto Backup Settings */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Respaldo Automático</h3>
                  <p className="text-sm text-gray-400">Configura respaldos automáticos de tus datos</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Activar respaldo automático</p>
                    <p className="text-xs text-gray-400">Crear respaldos según la frecuencia configurada</p>
                  </div>
                  <button
                    onClick={handleToggleAutoBackup}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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
                          className={`p-3 rounded-lg border text-sm transition-colors ${
                            settings.frequency === option.value
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
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoDownload ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.autoDownload ? 'translate-x-6' : 'translate-x-1'
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

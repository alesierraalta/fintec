'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { UpgradeModal } from '@/components/subscription/upgrade-modal';
import { LimitWarning } from '@/components/subscription/limit-warning';
import { BackupService, BackupOptions } from '@/lib/services/backup-service';
import {
  Download,
  Upload,
  Shield,
  Clock,
  Database,
  FileText,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BackupsPage() {
  const { user } = useAuth();
  const repository = useRepository();
  const { usageStatus, isAtLimit, tier, hasFeature } = useSubscription();
  const [backupService] = useState(() => new BackupService(repository));

  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeInactive: false,
    dateFrom: '',
    dateTo: '',
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear account states
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState('');
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    // Load last backup timestamp from localStorage
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    if (lastBackupTime) {
      setLastBackup(lastBackupTime);
    }
  }, []);

  const handleExportBackup = async () => {
    if (!user) return;

    // Check backup limit for free tier
    if (tier === 'free' && isAtLimit('backups')) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      setLoading(true);

      const blob = await backupService.exportToFile(user.id, backupOptions);
      const filename = backupService.generateBackupFilename(
        user.id,
        backupOptions
      );

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last backup time
      const now = new Date().toISOString();
      setLastBackup(now);
      localStorage.setItem('lastBackupTime', now);

      toast.success('Backup exportado exitosamente');
    } catch (error) {
      toast.error(
        'Error al exportar el backup. Por favor, intentalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!user || !event.target.files?.[0]) return;

    const file = event.target.files[0];

    try {
      setImportLoading(true);
      setImportResult(null);

      const result = await backupService.importFromFile(user.id, file, {
        overwrite: false,
        skipExisting: true,
      });

      setImportResult(result);

      if (result.errors.length === 0) {
        toast.success('Backup importado exitosamente');
      } else {
        toast.warning(
          `Backup importado con ${result.errors.length} errores. Revisa los detalles.`
        );
      }

      // Clear the input
      event.target.value = '';
    } catch (error) {
      toast.error(
        'Error al importar el backup. Verifica que el archivo sea valido.'
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleQuickBackup = async () => {
    await handleExportBackup();
  };

  const handleClearAccount = async () => {
    if (!user || clearConfirmation !== 'VACIAR CUENTA') {
      toast.error(
        'Por favor, escribe exactamente "VACIAR CUENTA" para confirmar.'
      );
      return;
    }

    try {
      setClearLoading(true);

      const response = await fetch('/api/clear-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationText: clearConfirmation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al vaciar la cuenta');
      }

      toast.success(
        'Cuenta vaciada exitosamente. Todos tus datos han sido eliminados.'
      );

      // Reset states and close modal
      setShowClearModal(false);
      setClearConfirmation('');

      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al vaciar la cuenta. Por favor, intentalo de nuevo.'
      );
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              Respaldo de Datos
            </h1>
            <p className="text-gray-400">
              Exporta e importa tus datos financieros de forma segura
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Datos encriptados</span>
          </div>
        </div>

        {/* Subscription Warning */}
        {tier === 'free' &&
          usageStatus &&
          usageStatus.backups.percentage >= 75 && (
            <LimitWarning
              title="Alcanzando límite de respaldos"
              message={`Has usado ${usageStatus.backups.current} de ${usageStatus.backups.limit} respaldos este mes. Actualiza a Base para respaldos ilimitados y automáticos.`}
              onUpgrade={() => setShowUpgradeModal(true)}
              severity={
                usageStatus.backups.percentage >= 100 ? 'error' : 'warning'
              }
            />
          )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Export Section */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Download className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Exportar Datos
                </h3>
                <p className="text-sm text-gray-400">
                  Crear respaldo de tus datos
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {lastBackup && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    Último respaldo:{' '}
                    {new Date(lastBackup).toLocaleString('es-ES')}
                  </span>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={handleQuickBackup}
                  disabled={loading}
                  className="flex-1"
                  icon={loading ? undefined : <Download className="h-4 w-4" />}
                >
                  {loading ? 'Exportando...' : 'Respaldo Rápido'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  icon={<Filter className="h-4 w-4" />}
                >
                  Opciones
                </Button>
              </div>

              {/* Advanced Options */}
              {showAdvancedOptions && (
                <div className="space-y-4 rounded-lg border border-gray-700 p-4">
                  <h4 className="text-sm font-medium text-white">
                    Opciones Avanzadas
                  </h4>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={backupOptions.includeInactive}
                        onChange={(e) =>
                          setBackupOptions((prev) => ({
                            ...prev,
                            includeInactive: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-600"
                      />
                      <span className="text-sm text-gray-300">
                        Incluir cuentas inactivas
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Desde
                        </label>
                        <input
                          type="date"
                          value={backupOptions.dateFrom || ''}
                          onChange={(e) =>
                            setBackupOptions((prev) => ({
                              ...prev,
                              dateFrom: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">
                          Hasta
                        </label>
                        <input
                          type="date"
                          value={backupOptions.dateTo || ''}
                          onChange={(e) =>
                            setBackupOptions((prev) => ({
                              ...prev,
                              dateTo: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleExportBackup}
                      disabled={loading}
                      variant="secondary"
                      className="w-full"
                      icon={
                        loading ? undefined : <Download className="h-4 w-4" />
                      }
                    >
                      {loading ? 'Exportando...' : 'Exportar con Filtros'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Import Section */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Upload className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Importar Datos
                </h3>
                <p className="text-sm text-gray-400">
                  Restaurar desde respaldo
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-gray-700 p-6 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <p className="mb-3 text-sm text-gray-400">
                  Selecciona un archivo de respaldo (.json)
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  disabled={importLoading}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  icon={
                    importLoading ? undefined : <Upload className="h-4 w-4" />
                  }
                >
                  {importLoading ? 'Importando...' : 'Seleccionar Archivo'}
                </Button>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="rounded-lg border border-gray-700 p-4">
                  <h4 className="mb-3 flex items-center space-x-2 text-sm font-medium text-white">
                    {importResult.errors.length === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    )}
                    <span>Resultado de la Importación</span>
                  </h4>

                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4 text-gray-300">
                      <div>
                        <p>
                          Cuentas: {importResult.imported.accounts} importadas
                        </p>
                        <p>
                          Transacciones: {importResult.imported.transactions}{' '}
                          importadas
                        </p>
                        <p>
                          Categorías: {importResult.imported.categories}{' '}
                          importadas
                        </p>
                      </div>
                      <div>
                        <p>
                          Presupuestos: {importResult.imported.budgets}{' '}
                          importados
                        </p>
                        <p>Metas: {importResult.imported.goals} importadas</p>
                        <p>
                          Omitidos:{' '}
                          {Object.values(importResult.skipped).reduce(
                            (a: number, b: unknown) =>
                              a + (typeof b === 'number' ? b : 0),
                            0
                          )}
                        </p>
                      </div>
                    </div>

                    {importResult.errors.length > 0 && (
                      <div className="mt-3 rounded border border-red-500/20 bg-red-500/10 p-2">
                        <p className="mb-1 text-xs font-medium text-red-400">
                          Errores:
                        </p>
                        <ul className="space-y-1 text-xs text-red-300">
                          {importResult.errors
                            .slice(0, 5)
                            .map((error: string, index: number) => (
                              <li key={index}>• {error}</li>
                            ))}
                          {importResult.errors.length > 5 && (
                            <li>
                              • ... y {importResult.errors.length - 5} errores
                              más
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Datos Incluidos
                </p>
                <p className="text-xs text-gray-400">
                  Cuentas, transacciones, categorías, presupuestos y metas
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Seguridad</p>
                <p className="text-xs text-gray-400">
                  Los datos se mantienen locales y privados
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">Formato</p>
                <p className="text-xs text-gray-400">
                  Archivo JSON estándar y portable
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
          <h3 className="mb-2 text-sm font-medium text-blue-400">
            💡 Consejos
          </h3>
          <ul className="space-y-1 text-sm text-blue-300">
            <li>
              • Realiza respaldos regularmente, especialmente antes de cambios
              importantes
            </li>
            <li>
              • Guarda los archivos de respaldo en un lugar seguro (nube, disco
              externo)
            </li>
            <li>
              • Los respaldos incluyen todos tus datos financieros en formato
              JSON
            </li>
            <li>
              • Puedes usar los filtros para crear respaldos parciales por
              fechas
            </li>
          </ul>
        </div>

        {/* Danger Zone - Clear Account */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="mb-4 flex items-start space-x-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 text-lg font-semibold text-red-400">
                Zona de Peligro
              </h3>
              <p className="text-sm text-gray-400">
                Esta acción es irreversible y eliminará TODOS tus datos
                financieros
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="mb-3 flex items-start space-x-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div className="text-sm text-red-300">
                  <p className="mb-1 font-medium">
                    ¿Estás completamente seguro?
                  </p>
                  <p className="text-xs text-red-400">
                    Al vaciar tu cuenta se eliminarán permanentemente:
                  </p>
                  <ul className="ml-4 mt-2 space-y-1 text-xs text-red-400">
                    <li>• Todas las transacciones</li>
                    <li>• Todas las cuentas y sus saldos</li>
                    <li>• Todos los presupuestos</li>
                    <li>• Todas las metas de ahorro</li>
                    <li>• Todas las categorías personalizadas</li>
                  </ul>
                </div>
              </div>

              <p className="mb-3 text-xs italic text-gray-400">
                💡 Recomendación: Crea un respaldo antes de vaciar tu cuenta
              </p>

              <Button
                variant="secondary"
                onClick={() => setShowClearModal(true)}
                icon={<Trash2 className="h-4 w-4" />}
                className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              >
                Vaciar Cuenta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Account Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          {/* * Modal with max-height for mobile scrolling */}
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-red-500/30 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400">
                Confirmar Eliminación Total
              </h3>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="mb-2 text-sm font-medium text-red-300">
                  ⚠️ Esta acción NO se puede deshacer
                </p>
                <p className="text-sm text-gray-300">
                  Se eliminarán permanentemente todos tus datos financieros.
                  Asegúrate de haber creado un respaldo si deseas conservar esta
                  información.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Para confirmar, escribe exactamente:{' '}
                  <span className="font-mono text-red-400">VACIAR CUENTA</span>
                </label>
                <input
                  type="text"
                  value={clearConfirmation}
                  onChange={(e) => setClearConfirmation(e.target.value)}
                  placeholder="Escribe VACIAR CUENTA"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={clearLoading}
                />
                <p className="mt-2 text-xs text-gray-400">
                  Debe coincidir exactamente (en mayúsculas)
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowClearModal(false);
                    setClearConfirmation('');
                  }}
                  disabled={clearLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleClearAccount}
                  disabled={
                    clearLoading || clearConfirmation !== 'VACIAR CUENTA'
                  }
                  icon={
                    clearLoading ? undefined : <Trash2 className="h-4 w-4" />
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {clearLoading ? 'Vaciando...' : 'Confirmar y Vaciar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        suggestedTier="base"
        reason="Has alcanzado tu límite de respaldos mensuales. Actualiza a Base para respaldos ilimitados y automáticos."
      />
    </MainLayout>
  );
}

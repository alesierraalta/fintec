'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
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
  Filter
} from 'lucide-react';

export default function BackupsPage() {
  const { user } = useAuth();
  const repository = useRepository();
  const [backupService] = useState(() => new BackupService(repository));
  
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupOptions, setBackupOptions] = useState<BackupOptions>({
    includeInactive: false,
    dateFrom: '',
    dateTo: ''
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load last backup timestamp from localStorage
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    if (lastBackupTime) {
      setLastBackup(lastBackupTime);
    }
  }, []);

  const handleExportBackup = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const blob = await backupService.exportToFile(user.id, backupOptions);
      const filename = backupService.generateBackupFilename(user.id, backupOptions);
      
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

      alert('¡Backup exportado exitosamente!');
    } catch (error) {
      alert('Error al exportar el backup. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    
    try {
      setImportLoading(true);
      setImportResult(null);
      
      const result = await backupService.importFromFile(user.id, file, {
        overwrite: false,
        skipExisting: true
      });
      
      setImportResult(result);
      
      if (result.errors.length === 0) {
        alert('¡Backup importado exitosamente!');
      } else {
        alert(`Backup importado con ${result.errors.length} errores. Revisa los detalles.`);
      }
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      alert('Error al importar el backup. Verifica que el archivo sea válido.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleQuickBackup = async () => {
    await handleExportBackup();
  };

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Respaldo de Datos</h1>
              <p className="text-gray-400">Exporta e importa tus datos financieros de forma segura</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Datos encriptados</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Download className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Exportar Datos</h3>
                  <p className="text-sm text-gray-400">Crear respaldo de tus datos</p>
                </div>
              </div>

              <div className="space-y-4">
                {lastBackup && (
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Último respaldo: {new Date(lastBackup).toLocaleString('es-ES')}</span>
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
                  <div className="border border-gray-700 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-medium text-white">Opciones Avanzadas</h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={backupOptions.includeInactive}
                          onChange={(e) => setBackupOptions(prev => ({
                            ...prev,
                            includeInactive: e.target.checked
                          }))}
                          className="rounded border-gray-600"
                        />
                        <span className="text-sm text-gray-300">Incluir cuentas inactivas</span>
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Desde</label>
                          <input
                            type="date"
                            value={backupOptions.dateFrom || ''}
                            onChange={(e) => setBackupOptions(prev => ({
                              ...prev,
                              dateFrom: e.target.value
                            }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                          <input
                            type="date"
                            value={backupOptions.dateTo || ''}
                            onChange={(e) => setBackupOptions(prev => ({
                              ...prev,
                              dateTo: e.target.value
                            }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleExportBackup}
                        disabled={loading}
                        variant="secondary"
                        className="w-full"
                        icon={loading ? undefined : <Download className="h-4 w-4" />}
                      >
                        {loading ? 'Exportando...' : 'Exportar con Filtros'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Importar Datos</h3>
                  <p className="text-sm text-gray-400">Restaurar desde respaldo</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-3">
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
                    icon={importLoading ? undefined : <Upload className="h-4 w-4" />}
                  >
                    {importLoading ? 'Importando...' : 'Seleccionar Archivo'}
                  </Button>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2">
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
                          <p>Cuentas: {importResult.imported.accounts} importadas</p>
                          <p>Transacciones: {importResult.imported.transactions} importadas</p>
                          <p>Categorías: {importResult.imported.categories} importadas</p>
                        </div>
                        <div>
                          <p>Presupuestos: {importResult.imported.budgets} importados</p>
                          <p>Metas: {importResult.imported.goals} importadas</p>
                          <p>Omitidos: {Object.values(importResult.skipped).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)}</p>
                        </div>
                      </div>
                      
                      {importResult.errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                          <p className="text-red-400 text-xs font-medium mb-1">Errores:</p>
                          <ul className="text-xs text-red-300 space-y-1">
                            {importResult.errors.slice(0, 5).map((error: string, index: number) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {importResult.errors.length > 5 && (
                              <li>• ... y {importResult.errors.length - 5} errores más</li>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Datos Incluidos</p>
                  <p className="text-xs text-gray-400">Cuentas, transacciones, categorías, presupuestos y metas</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-white">Seguridad</p>
                  <p className="text-xs text-gray-400">Los datos se mantienen locales y privados</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-white">Formato</p>
                  <p className="text-xs text-gray-400">Archivo JSON estándar y portable</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-400 mb-2">💡 Consejos</h3>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Realiza respaldos regularmente, especialmente antes de cambios importantes</li>
              <li>• Guarda los archivos de respaldo en un lugar seguro (nube, disco externo)</li>
              <li>• Los respaldos incluyen todos tus datos financieros en formato JSON</li>
              <li>• Puedes usar los filtros para crear respaldos parciales por fechas</li>
            </ul>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

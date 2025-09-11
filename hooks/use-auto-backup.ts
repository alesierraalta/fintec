import { useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { useRepository } from '@/providers/repository-provider';
import { BackupService } from '@/lib/services/backup-service';

export interface AutoBackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastBackup?: string;
  autoDownload: boolean;
}

const DEFAULT_SETTINGS: AutoBackupSettings = {
  enabled: false,
  frequency: 'weekly',
  autoDownload: false,
};

export function useAutoBackup() {
  const { user } = useAuth();
  const repository = useRepository();

  // Get settings from localStorage
  const getSettings = useCallback((): AutoBackupSettings => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    
    try {
      const stored = localStorage.getItem('autoBackupSettings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: AutoBackupSettings) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('autoBackupSettings', JSON.stringify(settings));
    } catch (error) {
    }
  }, []);

  // Check if backup is due
  const isBackupDue = useCallback((settings: AutoBackupSettings): boolean => {
    if (!settings.enabled || !settings.lastBackup) return settings.enabled;

    const lastBackup = new Date(settings.lastBackup);
    const now = new Date();
    const diffMs = now.getTime() - lastBackup.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    switch (settings.frequency) {
      case 'daily':
        return diffDays >= 1;
      case 'weekly':
        return diffDays >= 7;
      case 'monthly':
        return diffDays >= 30;
      default:
        return false;
    }
  }, []);

  // Perform automatic backup
  const performAutoBackup = useCallback(async () => {
    if (!user) return;

    try {
      const backupService = new BackupService(repository);
      const settings = getSettings();

      if (!settings.enabled || !isBackupDue(settings)) {
        return;
      }


      if (settings.autoDownload) {
        // Download backup file
        const blob = await backupService.exportToFile(user.id);
        const filename = backupService.generateBackupFilename(user.id);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Just create backup data and store metadata
        await backupService.exportUserData(user.id);
      }

      // Update last backup time
      const updatedSettings = {
        ...settings,
        lastBackup: new Date().toISOString(),
      };
      saveSettings(updatedSettings);

      // Show notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Backup Automático', {
          body: 'Respaldo de datos realizado exitosamente',
          icon: '/favicon.ico',
        });
      }

    } catch (error) {
      
      // Show error notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Error en Backup', {
          body: 'No se pudo realizar el respaldo automático',
          icon: '/favicon.ico',
        });
      }
    }
  }, [user, repository, getSettings, saveSettings, isBackupDue]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (error) {
      }
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AutoBackupSettings>) => {
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    saveSettings(updatedSettings);
    
    // Request notification permission when enabling auto backup
    if (newSettings.enabled && !currentSettings.enabled) {
      requestNotificationPermission();
    }
  }, [getSettings, saveSettings, requestNotificationPermission]);

  // Memoized current settings
  const currentSettings = useMemo(() => getSettings(), [getSettings]);
  
  // Memoized backup due status
  const backupDueStatus = useMemo(() => isBackupDue(currentSettings), [isBackupDue, currentSettings]);

  // Consolidated effect for backup management
  useEffect(() => {
    if (!user) return;

    // Initial check
    performAutoBackup();

    // Set up periodic checks (every hour)
    const interval = setInterval(() => {
      performAutoBackup();
    }, 60 * 60 * 1000); // 1 hour

    // Handle visibility change for immediate backup check
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Small delay to ensure the page is fully loaded
        setTimeout(performAutoBackup, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, performAutoBackup]);

  return {
    settings: currentSettings,
    updateSettings,
    performAutoBackup,
    isBackupDue: backupDueStatus,
    requestNotificationPermission,
  };
}


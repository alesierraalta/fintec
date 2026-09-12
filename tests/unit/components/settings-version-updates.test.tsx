import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '@/app/settings/settings-page-client';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useAutoBackup } from '@/hooks/use-auto-backup';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

jest.mock('@/hooks/use-auto-backup');
jest.mock('@/hooks/use-subscription');
jest.mock('@/hooks/use-app-update');
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SettingsPage - Versión y Actualizaciones section', () => {
  const mockUseAppUpdate = useAppUpdate as jest.Mock;
  const mockUseAutoBackup = useAutoBackup as jest.Mock;
  const mockUseSubscription = useSubscription as jest.Mock;
  const mockTriggerUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAutoBackup.mockReturnValue({
      settings: { enabled: false, frequency: 'daily', autoDownload: false },
      updateSettings: jest.fn(),
      performAutoBackup: jest.fn(),
      isBackupDue: false,
    });

    mockUseSubscription.mockReturnValue({
      tier: 'free',
      isPremium: false,
      isOwnerAdmin: false,
    });
  });

  it('displays current version and "Estás en la última versión" when web/not native', () => {
    mockUseAppUpdate.mockReturnValue({
      isNative: false,
      hasUpdate: false,
      updateAvailable: false,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      triggerUpdate: mockTriggerUpdate,
    });

    render(<SettingsPage />);

    expect(screen.getByTestId('version-updates-card')).toBeInTheDocument();
    expect(screen.getByText('Versión y Actualizaciones')).toBeInTheDocument();
    expect(screen.getByText('v1.0.1')).toBeInTheDocument();
    expect(screen.getByText('Estás en la última versión')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Actualizar/i })
    ).not.toBeInTheDocument();
  });

  it('displays "Estás en la última versión" when on native and up to date', () => {
    mockUseAppUpdate.mockReturnValue({
      isNative: true,
      hasUpdate: false,
      updateAvailable: false,
      currentVersion: '1.0.2',
      latestVersion: '1.0.2',
      triggerUpdate: mockTriggerUpdate,
    });

    render(<SettingsPage />);

    expect(screen.getByText('v1.0.2')).toBeInTheDocument();
    expect(screen.getByText('Estás en la última versión')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Actualizar/i })
    ).not.toBeInTheDocument();
  });

  it('displays "Actualización disponible: vX.Y.Z" and triggers update when on native and update is available', () => {
    mockUseAppUpdate.mockReturnValue({
      isNative: true,
      hasUpdate: true,
      updateAvailable: true,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      triggerUpdate: mockTriggerUpdate,
    });

    render(<SettingsPage />);

    expect(screen.getByText('v1.0.1')).toBeInTheDocument();
    expect(
      screen.getByText('Actualización disponible: v1.0.2')
    ).toBeInTheDocument();

    const updateButton = screen.getByRole('button', { name: /Actualizar/i });
    expect(updateButton).toBeInTheDocument();

    fireEvent.click(updateButton);

    expect(toast.success).toHaveBeenCalledWith('Actualizando FinTec...');
    expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
  });
});

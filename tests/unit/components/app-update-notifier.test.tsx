import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppUpdateNotifier } from '@/components/app/app-update-notifier';
import { useAppUpdate } from '@/hooks/use-app-update';
import { toast } from 'sonner';

jest.mock('@/hooks/use-app-update');
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AppUpdateNotifier Component', () => {
  const mockUseAppUpdate = useAppUpdate as jest.Mock;
  const mockDismissUpdate = jest.fn();
  const mockTriggerUpdate = jest.fn();
  const mockDownloadApkInApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when hasUpdate is false', () => {
    mockUseAppUpdate.mockReturnValue({
      hasUpdate: false,
      isDismissed: false,
      currentVersion: '1.0.1',
      latestVersion: '1.0.1',
      releaseNotes: '',
      isUpdating: false,
      dismissUpdate: mockDismissUpdate,
      triggerUpdate: mockTriggerUpdate,
      downloadApkInApp: mockDownloadApkInApp,
    });

    render(<AppUpdateNotifier />);
    expect(
      screen.queryByTestId('app-update-notification')
    ).not.toBeInTheDocument();
  });

  it('renders nothing when update was dismissed', () => {
    mockUseAppUpdate.mockReturnValue({
      hasUpdate: true,
      isDismissed: true,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      releaseNotes: 'Test release notes',
      isUpdating: false,
      dismissUpdate: mockDismissUpdate,
      triggerUpdate: mockTriggerUpdate,
      downloadApkInApp: mockDownloadApkInApp,
    });

    render(<AppUpdateNotifier />);
    expect(
      screen.queryByTestId('app-update-notification')
    ).not.toBeInTheDocument();
  });

  it('renders update banner with version details and release notes when update is available', () => {
    mockUseAppUpdate.mockReturnValue({
      hasUpdate: true,
      isDismissed: false,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      releaseNotes:
        'Novedades: Flujo Scan-to-Confirm en 1 tap y cámara directa.',
      isUpdating: false,
      dismissUpdate: mockDismissUpdate,
      triggerUpdate: mockTriggerUpdate,
      downloadApkInApp: mockDownloadApkInApp,
    });

    render(<AppUpdateNotifier />);

    expect(screen.getByTestId('app-update-notification')).toBeInTheDocument();
    expect(
      screen.getByText('Nueva versión de FinTec disponible')
    ).toBeInTheDocument();
    expect(screen.getByText('v1.0.2')).toBeInTheDocument();
    expect(screen.getByText(/versión actual:\s*v1\.0\.1/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Novedades: Flujo Scan-to-Confirm en 1 tap y cámara directa.'
      )
    ).toBeInTheDocument();
  });

  it('triggers update and shows notification toast when update button is clicked', () => {
    mockUseAppUpdate.mockReturnValue({
      hasUpdate: true,
      isDismissed: false,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      releaseNotes: 'Novedades de la versión',
      isUpdating: false,
      dismissUpdate: mockDismissUpdate,
      triggerUpdate: mockTriggerUpdate,
      downloadApkInApp: mockDownloadApkInApp,
    });

    render(<AppUpdateNotifier />);

    const updateButton = screen.getByRole('button', {
      name: /Actualizar ahora|Actualizar FinTec/i,
    });
    fireEvent.click(updateButton);

    expect(toast.success).toHaveBeenCalledWith(
      'Actualizando FinTec a la versión v1.0.2...'
    );
    expect(mockTriggerUpdate).toHaveBeenCalledTimes(1);
    expect(mockDismissUpdate).not.toHaveBeenCalled();
  });

  it('dismisses notification when "Más tarde" is clicked', () => {
    mockUseAppUpdate.mockReturnValue({
      hasUpdate: true,
      isDismissed: false,
      currentVersion: '1.0.1',
      latestVersion: '1.0.2',
      releaseNotes: 'Novedades de la versión',
      isUpdating: false,
      dismissUpdate: mockDismissUpdate,
      triggerUpdate: mockTriggerUpdate,
      downloadApkInApp: mockDownloadApkInApp,
    });

    render(<AppUpdateNotifier />);

    const dismissButton = screen.getByRole('button', { name: /Más tarde/i });
    fireEvent.click(dismissButton);

    expect(mockDismissUpdate).toHaveBeenCalledTimes(1);
    expect(mockTriggerUpdate).not.toHaveBeenCalled();
  });
});

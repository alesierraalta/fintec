import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { InstallAppSetting } from '@/components/pwa/install-app-setting';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import type { UsePwaInstallReturn } from '@/hooks/use-pwa-install';

jest.mock('@/hooks/use-pwa-install', () => ({
  usePwaInstall: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedUsePwaInstall = usePwaInstall as jest.MockedFunction<
  typeof usePwaInstall
>;

const promptInstallMock = jest.fn();
const dismissMock = jest.fn();

function mockReturn(
  overrides: Partial<UsePwaInstallReturn>
): UsePwaInstallReturn {
  return {
    platform: 'unsupported',
    promptKind: 'none',
    canInstall: false,
    promptInstall: promptInstallMock,
    dismiss: dismissMock,
    isDismissed: false,
    isIosPromptEligible: false,
    ...overrides,
  };
}

describe('InstallAppSetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a coherent "not supported" row (not null) when promptKind is none', () => {
    // N3: the surrounding settings card in
    // app/settings/settings-page-client.tsx has no knowledge of
    // `promptKind` and always renders a baseline description line above
    // this component. Rendering `null` here left an orphan sentence with
    // nothing under it on browsers with no install path (e.g. desktop
    // Firefox/Safari) — worse than the "Próximamente disponible"
    // placeholder this component replaced. A non-empty explanatory row
    // keeps the card coherent without leaking `promptKind` into the page.
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({ platform: 'unsupported', promptKind: 'none' })
    );

    render(<InstallAppSetting />);

    expect(
      screen.getByText(/no disponible en este navegador/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the already-installed confirmation with no button when promptKind is installed', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({ platform: 'installed', promptKind: 'installed' })
    );

    render(<InstallAppSetting />);

    expect(screen.getByText(/ya está instalada/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders an enabled action that calls promptInstall when native and canInstall', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallAppSetting />);

    const button = screen.getByRole('button', { name: /instalar/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(promptInstallMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces success feedback when promptInstall resolves accepted', async () => {
    promptInstallMock.mockResolvedValueOnce('accepted');
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallAppSetting />);
    fireEvent.click(screen.getByRole('button', { name: /instalar/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it('surfaces an error when promptInstall resolves unavailable', async () => {
    promptInstallMock.mockResolvedValueOnce('unavailable');
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallAppSetting />);
    fireEvent.click(screen.getByRole('button', { name: /instalar/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  });

  it('shows a disabled explanatory state when native and canInstall is false, with no clickable button', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: false,
      })
    );

    render(<InstallAppSetting />);

    expect(
      screen.getByText(/aún no ofreció la instalación/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still renders the native action when isDismissed is true (settings entry ignores the banner cooldown)', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
        isDismissed: true,
      })
    );

    render(<InstallAppSetting />);

    expect(
      screen.getByRole('button', { name: /instalar/i })
    ).toBeInTheDocument();
  });

  it('still renders the iOS instructions entry when isIosPromptEligible is false, and opens the sheet on click', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'ios',
        promptKind: 'instructions',
        isIosPromptEligible: false,
      })
    );

    render(<InstallAppSetting />);

    const button = screen.getByRole('button', {
      name: /instrucciones|instalar/i,
    });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByRole('region')).toBeInTheDocument();
  });
});

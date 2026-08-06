import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import type { UsePwaInstallReturn } from '@/hooks/use-pwa-install';

jest.mock('@/hooks/use-pwa-install', () => ({
  usePwaInstall: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}));

const mockedUsePwaInstall = usePwaInstall as jest.MockedFunction<
  typeof usePwaInstall
>;
const mockedUsePathname = usePathname as jest.MockedFunction<
  typeof usePathname
>;

const promptInstallMock = jest.fn();
const dismissMock = jest.fn();
const hideForSessionMock = jest.fn();

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
    hideForSession: hideForSessionMock,
    isHiddenThisSession: false,
    isIosPromptEligible: false,
    ...overrides,
  };
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePathname.mockReturnValue('/');
  });

  it('renders the action prompt when promptKind is native and canInstall is true', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallPrompt />);

    expect(
      screen.getByRole('button', { name: /instalar/i })
    ).toBeInTheDocument();
  });

  it('calls promptInstall when the accept action is used', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallPrompt />);
    fireEvent.click(screen.getByRole('button', { name: /instalar/i }));

    expect(promptInstallMock).toHaveBeenCalledTimes(1);
  });

  it('calls the persisted dismiss when the explicit dismiss action is used', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallPrompt />);
    fireEvent.click(screen.getByRole('button', { name: /ahora no/i }));

    expect(dismissMock).toHaveBeenCalledTimes(1);
    expect(hideForSessionMock).not.toHaveBeenCalled();
  });

  it('calls the transient hideForSession (not the persisted dismiss) on Escape', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    render(<InstallPrompt />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(hideForSessionMock).toHaveBeenCalledTimes(1);
    expect(dismissMock).not.toHaveBeenCalled();
  });

  it('renders the iOS sheet, not the action prompt, when promptKind is instructions and eligible', () => {
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'ios',
        promptKind: 'instructions',
        isIosPromptEligible: true,
      })
    );

    render(<InstallPrompt />);

    expect(
      screen.queryByRole('button', { name: /instalar/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it.each([
    [
      'iOS before the engagement threshold',
      {
        platform: 'ios',
        promptKind: 'instructions',
        isIosPromptEligible: false,
      },
    ],
    [
      'promptKind is none (unsupported: native shell or no install path)',
      { platform: 'unsupported', promptKind: 'none' },
    ],
    [
      'promptKind is installed (the settings entry owns that message)',
      { platform: 'installed', promptKind: 'installed' },
    ],
    [
      'dismissed',
      {
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
        isDismissed: true,
      },
    ],
    [
      'hidden for this session (e.g. an unrelated Escape keypress)',
      {
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
        isHiddenThisSession: true,
      },
    ],
  ] as const)('renders nothing when %s', (_label, overrides) => {
    mockedUsePwaInstall.mockReturnValue(mockReturn(overrides));

    const { container } = render(<InstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on an unauthenticated /auth route, even when otherwise installable', () => {
    mockedUsePathname.mockReturnValue('/auth/login');
    mockedUsePwaInstall.mockReturnValue(
      mockReturn({
        platform: 'android',
        promptKind: 'native',
        canInstall: true,
      })
    );

    const { container } = render(<InstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });
});

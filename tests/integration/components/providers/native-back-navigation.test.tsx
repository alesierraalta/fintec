import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, render } from '@testing-library/react';
import { NativeBackNavigation, useNativeBackNavigation } from '@/components/providers/native-back-navigation';
import {
  AppNavigationProvider,
  useAppNavigation,
} from '@/components/providers/app-navigation-provider';

const addListener = jest.fn();
const remove = jest.fn();
const back = jest.fn();
const push = jest.fn();
const replace = jest.fn();
const exitApp = jest.fn();
let native = true;
let pathname = '/';
let handler: ((event: { canGoBack: boolean }) => void) | undefined;
let resetNavigation: (() => void) | undefined;

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => {
      addListener(...args);
      handler = args[1] as typeof handler;
      return Promise.resolve({ remove });
    },
    exitApp: (...args: unknown[]) => exitApp(...args),
  },
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back, push, replace }),
  usePathname: () => pathname,
}));

function Surface({ open = false }: { open?: boolean }) {
  const register = useNativeBackNavigation();
  React.useEffect(() => open ? register({ id: 'surface', priority: 10, close: closeSurface }) : undefined, [open, register]);
  return null;
}
const closeSurface = jest.fn();

function ResetNavigationCapture() {
  const { replace } = useAppNavigation();
  React.useEffect(() => {
    resetNavigation = () => replace('/');
    return () => {
      resetNavigation = undefined;
    };
  }, [replace]);
  return null;
}

function NavigationSurface({
  open = false,
  captureReset = false,
}: {
  open?: boolean;
  captureReset?: boolean;
}) {
  return (
    <AppNavigationProvider>
      <NativeBackNavigation>
        <Surface open={open} />
        {captureReset ? <ResetNavigationCapture /> : null}
      </NativeBackNavigation>
    </AppNavigationProvider>
  );
}

describe('NativeBackNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handler = undefined;
    native = true;
    pathname = '/';
    resetNavigation = undefined;
  });

  it('registers once on native and cleans up async handles', async () => {
    const view = render(<NavigationSurface />);
    await act(async () => {});
    expect(addListener).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('closes a transient before routing', async () => {
    render(<NavigationSurface open />);
    await act(async () => {});
    act(() => handler?.({ canGoBack: true }));
    expect(closeSurface).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('traverses the logical stack even when native history is empty', async () => {
    pathname = '/transactions';
    const view = render(<NavigationSurface />);
    await act(async () => {});
    pathname = '/accounts';
    view.rerender(<NavigationSurface />);
    await act(async () => {});
    act(() => handler?.({ canGoBack: false }));
    view.unmount();
    expect(push).toHaveBeenCalledWith('/transactions');
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('falls back to Home instead of exiting when a non-root stack desynchronizes', async () => {
    pathname = '/transactions';
    render(<NavigationSurface captureReset />);
    await act(async () => {});
    act(() => resetNavigation?.());
    act(() => handler?.({ canGoBack: false }));

    expect(push).toHaveBeenCalledWith('/');
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('exits only at the Home root', async () => {
    render(<NavigationSurface />);
    await act(async () => {});
    act(() => handler?.({ canGoBack: true }));
    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it('does not install on web', async () => {
    native = false;
    render(<NavigationSurface />);
    await act(async () => {});
    expect(addListener).not.toHaveBeenCalled();
  });

  it('keeps Capacitor back handling active on Android 13+', () => {
    const manifest = fs.readFileSync(
      path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml'),
      'utf8'
    );

    expect(manifest).toContain('android:enableOnBackInvokedCallback="false"');
  });
});

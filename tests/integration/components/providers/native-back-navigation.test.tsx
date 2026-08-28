import React from 'react';
import { act, render } from '@testing-library/react';
import { NativeBackNavigation, useNativeBackNavigation } from '@/components/providers/native-back-navigation';

const addListener = jest.fn();
const remove = jest.fn();
const back = jest.fn();
const exitApp = jest.fn();
let native = true;
let handler: ((event: { canGoBack: boolean }) => void) | undefined;

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
jest.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));

function Surface({ open = false }: { open?: boolean }) {
  const register = useNativeBackNavigation();
  React.useEffect(() => open ? register({ id: 'surface', priority: 10, close: closeSurface }) : undefined, [open, register]);
  return null;
}
const closeSurface = jest.fn();

describe('NativeBackNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handler = undefined;
    native = true;
  });

  it('registers once on native and cleans up async handles', async () => {
    const view = render(<NativeBackNavigation><Surface /></NativeBackNavigation>);
    await act(async () => {});
    expect(addListener).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('closes a transient before routing', async () => {
    render(<NativeBackNavigation><Surface open /></NativeBackNavigation>);
    await act(async () => {});
    act(() => handler?.({ canGoBack: true }));
    expect(closeSurface).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it('routes when history exists and exits at root', async () => {
    const view = render(<NativeBackNavigation><Surface /></NativeBackNavigation>);
    await act(async () => {});
    act(() => handler?.({ canGoBack: true }));
    act(() => handler?.({ canGoBack: false }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(exitApp).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('does not install on web', async () => {
    native = false;
    render(<NativeBackNavigation><Surface /></NativeBackNavigation>);
    await act(async () => {});
    expect(addListener).not.toHaveBeenCalled();
  });
});

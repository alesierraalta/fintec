import { isNativeShell } from '@/lib/platform/native-shell';

let isNativePlatform = false;

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
  },
}));

describe('isNativeShell', () => {
  afterEach(() => {
    isNativePlatform = false;
  });

  it('reflects Capacitor.isNativePlatform()', () => {
    isNativePlatform = false;
    expect(isNativeShell()).toBe(false);

    isNativePlatform = true;
    expect(isNativeShell()).toBe(true);
  });
});

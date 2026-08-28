import { AppNavigationStack } from '@/lib/navigation/app-navigation-stack';

describe('AppNavigationStack', () => {
  it('keeps Home as root and traverses logical routes in LIFO order', () => {
    const stack = new AppNavigationStack();
    stack.push('/transactions');
    stack.push('/accounts');

    expect(stack.snapshot).toEqual(['/', '/transactions', '/accounts']);
    expect(stack.pop()).toBe('/transactions');
    expect(stack.pop()).toBe('/');
    expect(stack.pop()).toBeUndefined();
  });

  it('does not duplicate the current route and normalizes route decorations', () => {
    const stack = new AppNavigationStack('/transactions?period=month');
    stack.push('/transactions#details');

    expect(stack.snapshot).toEqual(['/', '/transactions']);
    expect(stack.size).toBe(2);
  });

  it('resets to Home before replacing the current route', () => {
    const stack = new AppNavigationStack('/transactions');
    stack.reset('/settings');

    expect(stack.snapshot).toEqual(['/', '/settings']);
    expect(stack.isAtRoot()).toBe(false);
  });
});

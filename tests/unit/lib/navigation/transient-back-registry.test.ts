import { TransientBackRegistry } from '@/lib/navigation/transient-back-registry';

describe('TransientBackRegistry', () => {
  it('closes highest priority and uses LIFO for ties', () => {
    const registry = new TransientBackRegistry();
    const closed: string[] = [];
    registry.register({
      id: 'low',
      priority: 1,
      close: () => closed.push('low'),
    });
    registry.register({
      id: 'first',
      priority: 2,
      close: () => closed.push('first'),
    });
    registry.register({
      id: 'second',
      priority: 2,
      close: () => closed.push('second'),
    });

    expect(registry.closeTop()).toBe(true);
    expect(registry.closeTop()).toBe(true);
    expect(closed).toEqual(['second', 'first']);
  });

  it('unregisters idempotently and ignores missing entries', () => {
    const registry = new TransientBackRegistry();
    const unregister = registry.register({
      id: 'dialog',
      priority: 1,
      close: jest.fn(),
    });

    unregister();
    unregister();
    expect(registry.unregister('missing')).toBe(false);
    expect(registry.closeTop()).toBe(false);
  });

  it('consumes before invoking close so one event closes once', () => {
    const registry = new TransientBackRegistry();
    const close = jest.fn(() => registry.closeTop());
    registry.register({ id: 'modal', priority: 1, close });

    expect(registry.closeTop()).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
    expect(registry.closeTop()).toBe(false);
  });
});

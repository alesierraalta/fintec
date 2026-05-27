export interface Lock {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

export class InMemoryLock implements Lock {
  private store = new Map<string, number>();

  async acquire(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (existing && existing > now) {
      return false;
    }
    this.store.set(key, now + ttlMs);
    return true;
  }

  async release(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

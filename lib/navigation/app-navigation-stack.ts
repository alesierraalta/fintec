export const APP_ROOT = '/';

function normalize(path: string): string {
  const [withoutHash] = path.split('#');
  const queryIndex = withoutHash.indexOf('?');
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : withoutHash.slice(queryIndex);
  const normalizedPathname = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  if (!normalizedPathname || normalizedPathname === '/') {
    return search ? `/${search}` : APP_ROOT;
  }

  return `${normalizedPathname}${search}`;
}

/** Logical app history, independent from the WebView's native history. */
export class AppNavigationStack {
  private entries: string[];

  constructor(initialPath = APP_ROOT) {
    const path = normalize(initialPath);
    this.entries = path === APP_ROOT ? [APP_ROOT] : [APP_ROOT, path];
  }

  get current(): string {
    return this.entries[this.entries.length - 1];
  }

  get size(): number {
    return this.entries.length;
  }

  get snapshot(): string[] {
    return [...this.entries];
  }

  push(path: string): void {
    const normalized = normalize(path);
    if (normalized === this.current) return;
    this.entries.push(normalized);
  }

  pop(): string | undefined {
    if (this.entries.length <= 1) return undefined;
    this.entries.pop();
    return this.current;
  }

  canGoBack(): boolean {
    return this.entries.length > 1;
  }

  isAtRoot(): boolean {
    return this.entries.length === 1 && this.current === APP_ROOT;
  }

  reset(path = APP_ROOT): void {
    this.entries = [APP_ROOT];
    this.push(path);
  }
}

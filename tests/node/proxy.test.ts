import * as fs from 'fs';
import * as path from 'path';

describe('proxy.ts (R6 compliance)', () => {
  it('proxy only calls updateSession', () => {
    const proxyPath = path.join(process.cwd(), 'proxy.ts');
    const content = fs.readFileSync(proxyPath, 'utf-8');

    // Must contain updateSession call
    expect(content).toContain('updateSession');

    // Must NOT contain redirect logic
    expect(content).not.toContain('redirect(');
    expect(content).not.toContain('NextResponse.redirect');
    expect(content).not.toContain('NextResponse.rewrite');

    // Must NOT contain auth gating logic
    expect(content).not.toContain('getUser');
    expect(content).not.toContain('requireAuthenticatedUser');
    expect(content).not.toContain('auth.');
  });

  it('proxy has correct matcher config', () => {
    const proxyPath = path.join(process.cwd(), 'proxy.ts');
    const content = fs.readFileSync(proxyPath, 'utf-8');

    // Must have matcher config
    expect(content).toContain('matcher');
    expect(content).toContain('_next/static');
    expect(content).toContain('_next/image');
    expect(content).toContain('favicon.ico');
  });
});

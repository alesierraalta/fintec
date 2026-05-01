import * as fs from 'fs';
import * as path from 'path';

describe('middleware.ts (R6 compliance)', () => {
  it('middleware only calls updateSession', () => {
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf-8');

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

  it('middleware has correct matcher config', () => {
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf-8');

    // Must have matcher config
    expect(content).toContain('matcher');
    expect(content).toContain('_next/static');
    expect(content).toContain('_next/image');
    expect(content).toContain('favicon.ico');
  });
});

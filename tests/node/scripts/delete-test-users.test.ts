import {
  groupDependencyCounts,
  normalizeAuthUsers,
  reconcileTargets,
  serializeAudit,
  validateTargetProject,
  validateConfirmation,
} from '@/scripts/admin/delete-test-users';

describe('delete test users helpers', () => {
  it('delegates matching and groups profile-owned rows through accounts', () => {
    const targets = normalizeAuthUsers({
      data: {
        users: [
          { id: 'u1', email: 'TEST@FINTEC.COM', created_at: '2026-01-01' },
          { id: 'u2', email: 'real@fintec.com' },
        ],
      },
    });
    expect(targets).toHaveLength(1);
    expect(
      groupDependencyCounts(targets, {
        accounts: [{ id: 'a1', user_id: 'u1' }],
        transactions: [{ account_id: 'a1' }],
        budgets: [{ user_id: 'u1' }],
      })
    ).toEqual({
      u1: expect.objectContaining({
        accounts: 1,
        transactions: 1,
        budgets: 1,
        goals: 0,
      }),
    });
  });
  it('requires confirmation and reconciles exact sorted IDs', () => {
    expect(validateConfirmation({ confirm: false, yes: true }, 2)).toBe(false);
    expect(validateConfirmation({ confirm: true, yes: false }, 2, '2')).toBe(
      true
    );
    expect(
      reconcileTargets([{ id: 'b' }, { id: 'a' }], [{ id: 'a' }, { id: 'b' }])
        .ok
    ).toBe(true);
    expect(reconcileTargets([{ id: 'a' }], [{ id: 'b' }]).ok).toBe(false);
  });
  it.each([
    ['unset', undefined, 'https://project.supabase.co'],
    ['mismatched', 'https://other.supabase.co', 'https://project.supabase.co'],
  ])('rejects %s target project URLs', (_, configured, target) => {
    expect(() => validateTargetProject(configured, target)).toThrow(
      'DELETE_TEST_USERS_TARGET_URL'
    );
  });

  it('accepts an exact target project URL match', () => {
    expect(
      validateTargetProject(
        'https://project.supabase.co',
        'https://project.supabase.co'
      )
    ).toBe(true);
  });

  it('redacts emails and credentials from audit JSON', () => {
    const serialized = serializeAudit({
      mode: 'dry_run',
      targets: [{ id: 'u1', email: 'test@fintec.com' }],
    });
    expect(serialized).toContain('u1');
    expect(serialized).not.toContain('test@fintec.com');
    expect(serialized).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

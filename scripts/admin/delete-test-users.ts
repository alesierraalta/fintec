import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServiceClient } from '@/lib/supabase/admin';
import { getAdminUserIds } from '@/lib/payment-orders/admin-utils';
import { isTestUserEmail } from '@/lib/admin/test-users';

export type Target = { id: string; email?: string; created_at?: string | null };
export type DeleteArgs = { confirm: boolean; yes: boolean; audit?: string };
export function parseArgs(argv: string[]): DeleteArgs {
  return {
    confirm: argv.includes('--confirm'),
    yes: argv.includes('--yes'),
    audit: argv.find((value) => value.startsWith('--audit='))?.slice(8),
  };
}
export function normalizeAuthUsers(
  response:
    | {
        data?: {
          users?: Array<{
            id: string;
            email?: string | null;
            created_at?: string | null;
          }> | null;
        } | null;
      }
    | Array<{ id: string; email?: string | null; created_at?: string | null }>
): Target[] {
  const users = Array.isArray(response)
    ? response
    : (response.data?.users ?? []);
  return users
    .filter((user) => isTestUserEmail(user.email))
    .map((user) => ({
      id: user.id,
      email: user.email ?? undefined,
      created_at: user.created_at,
    }));
}
export function groupDependencyCounts(
  targets: Target[],
  rows: Record<string, Array<Record<string, unknown>>>
) {
  const counts = new Map(
    targets.map((target) => [
      target.id,
      {
        accounts: 0,
        transactions: 0,
        budgets: 0,
        goals: 0,
        subscriptions: 0,
        feedbacks: 0,
        notifications: 0,
        usage_tracking: 0,
      },
    ])
  );
  const owners = new Map(
    (rows.accounts ?? []).map((row) => [String(row.id), String(row.user_id)])
  );
  for (const [table, tableRows] of Object.entries(rows))
    for (const row of tableRows) {
      const userId =
        table === 'transactions'
          ? owners.get(String(row.account_id))
          : typeof row.user_id === 'string'
            ? row.user_id
            : undefined;
      const count = counts.get(userId ?? '');
      if (count && table in count) (count as Record<string, number>)[table]++;
    }
  return Object.fromEntries(counts);
}
export function reconcileTargets(
  reviewed: Target[],
  current: Target[]
): { ok: boolean; reason?: string } {
  const a = reviewed.map((target) => target.id).sort();
  const b = current.map((target) => target.id).sort();
  return a.length === b.length && a.every((id, index) => id === b[index])
    ? { ok: true }
    : { ok: false, reason: 'target_set_changed' };
}
export function validateConfirmation(
  args: DeleteArgs,
  targetCount: number,
  token?: string
): boolean {
  return (
    args.confirm &&
    targetCount > 0 &&
    (args.yes || token === String(targetCount))
  );
}
export function serializeAudit(input: {
  mode: string;
  targets: Target[];
  counts?: Record<string, unknown>;
  outcomes?: Record<string, unknown>;
  deletedAuthIds?: string[];
}) {
  return JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      mode: input.mode,
      targetCount: input.targets.length,
      targetIds: input.targets.map((target) => target.id),
      dependentRowCounts: input.counts ?? {},
      outcomes: input.outcomes ?? {},
      deletedAuthIds: input.deletedAuthIds ?? [],
    },
    null,
    2
  );
}
export async function writeAuditAtomic(
  path: string,
  content: string
): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, path);
}

export async function deleteTargets(
  client: any,
  reviewed: Target[],
  current: Target[],
  auditPath: string
): Promise<string[]> {
  const reconciliation = reconcileTargets(reviewed, current);
  if (!reconciliation.ok || current.length === 0)
    throw new Error(reconciliation.reason ?? 'No targets');
  if (current.some((target) => getAdminUserIds().includes(target.id)))
    throw new Error('Administrator target rejected');
  const deletedAuthIds: string[] = [];
  const outcomes: Record<string, string> = {};
  for (const target of current) {
    try {
      const profile = await client.from('users').delete().eq('id', target.id);
      if (profile.error) throw profile.error;
      const authResult = await client.auth.admin.deleteUser(target.id);
      if (authResult.error) throw authResult.error;
      const profileRead = await client
        .from('users')
        .select('id')
        .eq('id', target.id)
        .maybeSingle();
      const authRead = await client.auth.admin.getUserById(target.id);
      if (profileRead.data || authRead.data?.user)
        throw new Error('readback_failed');
      outcomes[target.id] = 'deleted';
      deletedAuthIds.push(target.id);
    } catch (error) {
      outcomes[target.id] = 'failed';
      await writeAuditAtomic(
        auditPath,
        serializeAudit({
          mode: 'confirmed',
          targets: current,
          outcomes,
          deletedAuthIds,
        })
      );
      throw error;
    }
  }
  await writeAuditAtomic(
    auditPath,
    serializeAudit({
      mode: 'confirmed',
      targets: current,
      outcomes,
      deletedAuthIds,
    })
  );
  return deletedAuthIds;
}

async function inventory(client: any): Promise<Target[]> {
  const users: Target[] = [];
  for (let page = 1; ; page++) {
    const response = await client.auth.admin.listUsers({ page, perPage: 1000 });
    users.push(...normalizeAuthUsers(response));
    if ((response.data?.users ?? []).length < 1000) return users;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    );
  const client = createServiceClient();
  const users = await inventory(client);
  if (!users.length) throw new Error('No matching test users found');
  for (const user of users)
    console.log(`${user.id}\t${user.email ?? ''}\t${user.created_at ?? ''}`);
  const auditPath =
    args.audit ?? join('.local-audit', `delete-test-users-${Date.now()}.json`);
  await writeAuditAtomic(
    auditPath,
    serializeAudit({ mode: 'dry_run', targets: users })
  );
  if (!args.confirm) return;
  if (
    !validateConfirmation(
      args,
      users.length,
      process.env.DELETE_TEST_USERS_COUNT
    )
  )
    throw new Error('Exact target count confirmation or --yes is required');
  const current = await inventory(client);
  await deleteTargets(client, users, current, auditPath);
}

if (process.argv[1]?.endsWith('delete-test-users.ts'))
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Deletion failed');
    process.exitCode = 1;
  });

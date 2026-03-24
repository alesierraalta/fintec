import { createServiceClient } from '@/lib/supabase/admin';
import { getCanonicalTestUserConfig } from './canonical-user';

export async function ensureCanonicalAuthUser() {
  const adminClient = createServiceClient();
  const config = getCanonicalTestUserConfig();

  const { data: usersData, error: listError } =
    await adminClient.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const matches = usersData.users.filter((u) => u.email === config.email);

  if (matches.length > 1) {
    throw new Error(`Multiple users found for canonical email ${config.email}`);
  }

  if (matches.length === 0) {
    const { error: createError } = await adminClient.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        isCanonicalTestUser: true,
        displayName: config.displayName,
      },
    });

    if (createError) {
      throw new Error(
        `Failed to create canonical auth user: ${createError.message}`
      );
    }

    return { created: true, repaired: false };
  }

  const existing = matches[0];
  const metadata = existing.user_metadata || {};

  if (
    !metadata.isCanonicalTestUser ||
    metadata.displayName !== config.displayName
  ) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      existing.id,
      {
        user_metadata: {
          ...metadata,
          isCanonicalTestUser: true,
          displayName: config.displayName,
        },
      }
    );

    if (updateError) {
      throw new Error(
        `Failed to repair canonical auth user metadata: ${updateError.message}`
      );
    }

    return { created: false, repaired: true };
  }

  return { created: false, repaired: false };
}

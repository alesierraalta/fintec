import {
  seedEvalDataset,
  EVAL_FIXTURE_PASSWORD,
  fixtureEmail,
} from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import {
  createServiceRoleClient,
  createUserSessionClient,
} from './support/auth-client';

/**
 * Issue #46 regression: `payment_orders` RLS used to grant any user with
 * `users.tier = 'premium'` cross-tenant SELECT + UPDATE over EVERY payment
 * order, because the premium `EXISTS(...)` branch was not constrained to the
 * order's `user_id`. Fixed by
 * supabase/migrations/20260810150000_harden_payment_orders_rls.sql (see also
 * supabase/schemas/baseline.sql): both policies are now scoped strictly to
 * `auth.uid() = user_id`, and the UPDATE policy keeps its pre-existing
 * `status = 'pending'` gate for the owner.
 *
 * Uses REAL GoTrue-signed-in user clients (`createUserSessionClient`), never
 * the service-role client: the admin listing/approval path is intentionally
 * service-role (bypasses RLS, gated by `isAdmin()` in
 * lib/payment-orders/admin-utils.ts), so a service-role assertion could not
 * distinguish the vulnerable policy from the fixed one.
 */
describe('payment_orders cross-user RLS enforcement (issue #46)', () => {
  const serviceClient = createServiceRoleClient();
  let ownerId: string;
  let premiumUserId: string;
  let ownerOrderId: string;

  beforeAll(async () => {
    const owner = await seedEvalDataset(serviceClient, {
      userKey: 'rls-po-owner',
    });
    const premiumUser = await seedEvalDataset(serviceClient, {
      userKey: 'rls-po-premium',
    });
    ownerId = owner.userId;
    premiumUserId = premiumUser.userId;

    // premiumUserId simulates a PAID premium subscriber (a purchasable tier,
    // see app/pricing/pricing-page-client.tsx). Under the vulnerable policy
    // this flag alone granted cross-tenant read+write over all orders.
    const { error: tierError } = await serviceClient
      .from('users')
      .update({ tier: 'premium' })
      .eq('id', premiumUserId);
    if (tierError) {
      throw new Error(
        `payment-orders RLS test: failed to set premium tier: ${tierError.message}`
      );
    }

    // Seed one payment order owned by `ownerId` in 'pending' status.
    const { data: order, error: orderError } = await serviceClient
      .from('payment_orders')
      .insert({
        user_id: ownerId,
        amount_minor: 10000,
        currency_code: 'USD',
        description: 'cross-user rls order',
        status: 'pending',
      })
      .select('id')
      .single();
    if (orderError || !order) {
      throw new Error(
        `payment-orders RLS test: failed to seed order: ${orderError?.message}`
      );
    }
    ownerOrderId = order.id as string;
  });

  afterAll(async () => {
    await teardownEvalDataset(serviceClient, ownerId);
    await teardownEvalDataset(serviceClient, premiumUserId);
  });

  it('a premium user CANNOT SELECT another user order by id', async () => {
    const clientB = await createUserSessionClient(
      fixtureEmail('rls-po-premium'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientB
      .from('payment_orders')
      .select('id')
      .eq('id', ownerOrderId)
      .maybeSingle();

    expect(error).toBeNull();
    // Regression: under the vulnerable premium EXISTS branch this returned
    // the other user's order; the fixed policy returns no row.
    expect(data).toBeNull();
  });

  it('a premium user CANNOT list another user orders', async () => {
    const clientB = await createUserSessionClient(
      fixtureEmail('rls-po-premium'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientB
      .from('payment_orders')
      .select('id')
      .eq('user_id', ownerId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it('a premium user CANNOT UPDATE another user order', async () => {
    const clientB = await createUserSessionClient(
      fixtureEmail('rls-po-premium'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientB
      .from('payment_orders')
      .update({ admin_notes: 'escalation attempt' })
      .eq('id', ownerOrderId)
      .select('id');

    expect(error).toBeNull();
    // Regression: under the vulnerable premium EXISTS branch this returned
    // the other user's order id (1 row updated); the fixed policy updates 0.
    expect(data ?? []).toHaveLength(0);
  });

  it('the owner retains SELECT access to their own order', async () => {
    const clientOwner = await createUserSessionClient(
      fixtureEmail('rls-po-owner'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientOwner
      .from('payment_orders')
      .select('id')
      .eq('id', ownerOrderId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(ownerOrderId);
  });

  it('the owner retains UPDATE access to their own pending order', async () => {
    const clientOwner = await createUserSessionClient(
      fixtureEmail('rls-po-owner'),
      EVAL_FIXTURE_PASSWORD
    );

    const { data, error } = await clientOwner
      .from('payment_orders')
      .update({ description: 'updated by owner' })
      .eq('id', ownerOrderId)
      .select('id');

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });
});

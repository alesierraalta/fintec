import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestContext } from '@/lib/cache/request-context';
import { ServerReadCache } from '@/lib/cache/server-read-cache';
import type {
  AIInfraRepository,
  AppRepository,
  ApprovalRequestsRepository,
  OrdersRepository,
  PaymentOrdersRepository,
  SubscriptionsRepository,
  TransfersRepository,
  WaitlistRepository,
  UsersProfileRepository,
} from '@/repositories/contracts';
import { LocalAppRepository } from '@/repositories/local';
import {
  SupabaseAIInfraRepository,
  SupabaseAppRepository,
  SupabaseApprovalRequestsRepository,
  SupabaseOrdersRepository,
  SupabasePaymentOrdersRepository,
  SupabaseSubscriptionsRepository,
  SupabaseTransfersRepository,
  SupabaseUsersProfileRepository,
  SupabaseWaitlistRepository,
} from '@/repositories/supabase';

export type DBProvider = 'supabase' | 'local' | 'postgres';

const DEFAULT_SERVER_PROVIDER: DBProvider = 'supabase';
const DEFAULT_CLIENT_PROVIDER: DBProvider = 'supabase';

function assertNever(value: never): never {
  throw new Error(`Unsupported DB provider: ${String(value)}`);
}

function normalizeProvider(
  value: string | undefined,
  fallback: DBProvider
): DBProvider {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();

  if (
    normalized === 'supabase' ||
    normalized === 'local' ||
    normalized === 'postgres'
  ) {
    return normalized;
  }

  return fallback;
}

export function getServerDBProvider(): DBProvider {
  return normalizeProvider(
    process.env.DB_PROVIDER,
    normalizeProvider(
      process.env.NEXT_PUBLIC_DB_PROVIDER,
      DEFAULT_SERVER_PROVIDER
    )
  );
}

export function getClientDBProvider(): DBProvider {
  return normalizeProvider(
    process.env.NEXT_PUBLIC_DB_PROVIDER,
    DEFAULT_CLIENT_PROVIDER
  );
}

interface CreateServerRepositoryOptions {
  provider?: DBProvider;
  supabase?: SupabaseClient;
  requestContext?: RequestContext;
  readCache?: ServerReadCache;
}

interface CreateServerScopedRepositoryOptions {
  provider?: DBProvider;
  supabase?: SupabaseClient;
  serviceSupabase?: SupabaseClient;
  requestContext?: RequestContext;
}

function requireSupabaseClient(client?: SupabaseClient): SupabaseClient {
  if (!client) {
    throw new Error('Supabase client is required when DB_PROVIDER is supabase');
  }

  return client;
}

export function createServerAppRepository(
  options: CreateServerRepositoryOptions = {}
): AppRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseAppRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext,
        options.readCache
      );
    }
    case 'local': {
      return new LocalAppRepository();
    }
    case 'postgres': {
      throw new Error(
        'DB_PROVIDER=postgres is not implemented yet. Implement Postgres adapters first.'
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createClientAppRepository(
  provider: DBProvider = getClientDBProvider()
): AppRepository {
  switch (provider) {
    case 'supabase': {
      return new SupabaseAppRepository();
    }
    case 'local': {
      return new LocalAppRepository();
    }
    case 'postgres': {
      throw new Error(
        'NEXT_PUBLIC_DB_PROVIDER=postgres is not implemented for client repositories.'
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerTransfersRepository(
  options: CreateServerScopedRepositoryOptions = {}
): TransfersRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseTransfersRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Transfers repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerWaitlistRepository(
  options: CreateServerScopedRepositoryOptions = {}
): WaitlistRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseWaitlistRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Waitlist repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerApprovalRequestsRepository(
  options: CreateServerScopedRepositoryOptions = {}
): ApprovalRequestsRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseApprovalRequestsRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Approval requests repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerAIInfraRepository(
  options: CreateServerScopedRepositoryOptions = {}
): AIInfraRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseAIInfraRepository(
        options.supabase,
        options.requestContext,
        options.serviceSupabase
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `AI infra repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerSubscriptionsRepository(
  options: CreateServerScopedRepositoryOptions = {}
): SubscriptionsRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseSubscriptionsRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Subscriptions repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerPaymentOrdersRepository(
  options: CreateServerScopedRepositoryOptions = {}
): PaymentOrdersRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabasePaymentOrdersRepository(
        options.serviceSupabase,
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Payment orders repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerOrdersRepository(
  options: CreateServerScopedRepositoryOptions = {}
): OrdersRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseOrdersRepository(
        options.serviceSupabase,
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Orders repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

export function createServerUsersProfileRepository(
  options: CreateServerScopedRepositoryOptions = {}
): UsersProfileRepository {
  const provider = options.provider ?? getServerDBProvider();

  switch (provider) {
    case 'supabase': {
      return new SupabaseUsersProfileRepository(
        requireSupabaseClient(options.supabase),
        options.requestContext
      );
    }
    case 'local':
    case 'postgres': {
      throw new Error(
        `Users profile repository is not implemented for DB_PROVIDER=${provider}`
      );
    }
    default: {
      return assertNever(provider);
    }
  }
}

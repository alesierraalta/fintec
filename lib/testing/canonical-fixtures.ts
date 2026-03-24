import {
  type CanonicalTestUserConfig,
  getCanonicalTestUserConfig,
} from '@/tests/support/auth/canonical-user';
import type {
  AppRepository,
  CreateAccountDTO,
  CreateCategoryDTO,
  UpsertUserProfileInput,
} from '@/repositories/contracts';
import type { Account, Category } from '@/types';
import { AccountType, CategoryKind } from '@/types';

export const CANONICAL_FIXTURE_ACCOUNT: CreateAccountDTO = {
  name: 'Fintec Canonical Cash',
  type: AccountType.CASH,
  currencyCode: 'USD',
  balance: 0,
  active: true,
};

export const CANONICAL_FIXTURE_CATEGORIES = {
  income: {
    name: 'Fintec Canonical Income',
    kind: CategoryKind.INCOME,
    color: '#16a34a',
    icon: 'ArrowDownCircle',
    active: true,
    isDefault: false,
  },
  expense: {
    name: 'Fintec Canonical Expense',
    kind: CategoryKind.EXPENSE,
    color: '#dc2626',
    icon: 'ArrowUpCircle',
    active: true,
    isDefault: false,
  },
} as const satisfies {
  income: CreateCategoryDTO;
  expense: CreateCategoryDTO;
};

interface AuthenticatedFixtureUser {
  id: string;
  email?: string | null;
  user_metadata?: {
    name?: string | null;
  };
}

interface CanonicalFixtureDependencies {
  authUser: AuthenticatedFixtureUser;
  appRepository: Pick<AppRepository, 'accounts' | 'categories'>;
  usersProfileRepository: {
    upsert(input: UpsertUserProfileInput): Promise<void>;
  };
  canonicalUser?: CanonicalTestUserConfig;
}

export interface CanonicalFixtureBootstrapResult {
  account: Account;
  incomeCategory: Category;
  expenseCategory: Category;
  created: {
    account: boolean;
    incomeCategory: boolean;
    expenseCategory: boolean;
  };
  profile: {
    email: string;
    displayName: string;
    baseCurrency: string;
  };
}

function getCanonicalProfileIdentity(
  authUser: AuthenticatedFixtureUser,
  canonicalUser: CanonicalTestUserConfig
) {
  const email = authUser.email?.trim() || canonicalUser.email;
  const displayName =
    authUser.user_metadata?.name?.trim() || canonicalUser.displayName;

  return {
    email,
    displayName,
    baseCurrency: canonicalUser.baseCurrency,
  };
}

function findMatchingAccount(
  accounts: Account[],
  currencyCode: string
): Account | undefined {
  return accounts.find(
    (account) =>
      account.active &&
      account.name === CANONICAL_FIXTURE_ACCOUNT.name &&
      account.currencyCode === currencyCode
  );
}

function findMatchingCategory(
  categories: Category[],
  target: CreateCategoryDTO
): Category | undefined {
  return categories.find(
    (category) =>
      category.active &&
      category.kind === target.kind &&
      category.name === target.name
  );
}

export async function ensureCanonicalUserFixtures(
  dependencies: CanonicalFixtureDependencies
): Promise<CanonicalFixtureBootstrapResult> {
  const canonicalUser =
    dependencies.canonicalUser ?? getCanonicalTestUserConfig();
  const profile = getCanonicalProfileIdentity(
    dependencies.authUser,
    canonicalUser
  );

  await dependencies.usersProfileRepository.upsert({
    id: dependencies.authUser.id,
    email: profile.email,
    name: profile.displayName,
    baseCurrency: profile.baseCurrency,
  });

  const activeAccounts = await dependencies.appRepository.accounts.findActive();
  let account = findMatchingAccount(activeAccounts, profile.baseCurrency);
  const created = {
    account: false,
    incomeCategory: false,
    expenseCategory: false,
  };

  if (!account) {
    account = await dependencies.appRepository.accounts.create({
      ...CANONICAL_FIXTURE_ACCOUNT,
      currencyCode: profile.baseCurrency,
    });
    created.account = true;
  }

  const incomeCategories =
    await dependencies.appRepository.categories.findByKind(CategoryKind.INCOME);
  let incomeCategory = findMatchingCategory(
    incomeCategories,
    CANONICAL_FIXTURE_CATEGORIES.income
  );

  if (!incomeCategory) {
    incomeCategory = await dependencies.appRepository.categories.create(
      CANONICAL_FIXTURE_CATEGORIES.income
    );
    created.incomeCategory = true;
  }

  const expenseCategories =
    await dependencies.appRepository.categories.findByKind(
      CategoryKind.EXPENSE
    );
  let expenseCategory = findMatchingCategory(
    expenseCategories,
    CANONICAL_FIXTURE_CATEGORIES.expense
  );

  if (!expenseCategory) {
    expenseCategory = await dependencies.appRepository.categories.create(
      CANONICAL_FIXTURE_CATEGORIES.expense
    );
    created.expenseCategory = true;
  }

  return {
    account,
    incomeCategory,
    expenseCategory,
    created,
    profile,
  };
}

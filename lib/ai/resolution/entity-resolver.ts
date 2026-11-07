import { matchReceiptCategory } from '@/lib/ai/receipt-scanner/category-matcher';
import type { Account, Category } from '@/types/domain';

export type TransactionKind = 'INCOME' | 'EXPENSE';

export type Resolution<T> =
  | { status: 'resolved'; value: T }
  | {
      status: 'needs_clarification';
      field: 'category' | 'account' | 'exchangeRate' | 'transaction';
      message: string;
      options: string[];
    };

export function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Categories a transaction of `kind` may use: active defaults (user_id NULL)
 * plus the user's own categories.
 */
export function categoriesForKind(
  categories: Category[],
  userId: string,
  kind: TransactionKind
): Category[] {
  return categories.filter(
    (c) =>
      c.kind === kind &&
      c.active !== false &&
      (c.userId === null || c.userId === undefined || c.userId === userId)
  );
}

/**
 * Resolves the category of a chat-created transaction. Order: model-chosen
 * id, then name/keyword matching over the name and description. It never
 * falls back to an arbitrary category: no confident match asks the user.
 */
export function resolveCategory(params: {
  categories: Category[];
  userId: string;
  kind: TransactionKind;
  categoryId?: string;
  categoryName?: string;
  description?: string;
}): Resolution<Category> {
  const candidates = categoriesForKind(
    params.categories,
    params.userId,
    params.kind
  );

  const byId = params.categoryId
    ? candidates.find((c) => c.id === params.categoryId)
    : undefined;
  if (byId) return { status: 'resolved', value: byId };

  const match = matchReceiptCategory(
    {
      transactionType: params.kind,
      suggestedCategoryName: params.categoryName,
      suggestedMotive: params.description,
    },
    candidates.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))
  );
  const matched =
    match.suggestedCategoryId &&
    (match.confidence === 'HIGH' || match.confidence === 'MEDIUM')
      ? candidates.find((c) => c.id === match.suggestedCategoryId)
      : undefined;
  if (matched) return { status: 'resolved', value: matched };

  const label = params.categoryName ?? params.description ?? '';
  const kindLabel = params.kind === 'INCOME' ? 'ingreso' : 'gasto';
  return {
    status: 'needs_clarification',
    field: 'category',
    message:
      candidates.length > 0
        ? `No encontré una categoría de ${kindLabel} para "${label}". ¿En cuál la registro?`
        : `No tienes categorías de ${kindLabel}. Crea una primero.`,
    options: candidates.map((c) => c.name),
  };
}

/**
 * Resolves an account by name (accent- and case-insensitive). An omitted
 * name uses the first account; a name that matches nothing asks the user.
 */
export function resolveAccount(params: {
  accounts: Account[];
  accountName?: string;
}): Resolution<Account> {
  const { accounts, accountName } = params;
  if (!accountName) return { status: 'resolved', value: accounts[0] };

  const wanted = normalizeName(accountName);
  const match =
    accounts.find((a) => normalizeName(a.name) === wanted) ??
    accounts.find((a) => normalizeName(a.name).includes(wanted));
  if (match) return { status: 'resolved', value: match };

  return {
    status: 'needs_clarification',
    field: 'account',
    message: `No encontré la cuenta "${accountName}". ¿Cuál uso?`,
    options: accounts.map((a) => a.name),
  };
}

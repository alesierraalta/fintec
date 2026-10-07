// Ultra-simple pending checklists: "things I still have to buy" and
// "payments I know are coming". No dates, no recurrence — just a name
// and an optional approximate amount in the user's base currency.

export type PendingItemKind = 'purchase' | 'payment';

export interface PendingItem {
  id: string;
  userId: string;
  kind: PendingItemKind;
  name: string;
  /**
   * Approximate amount in the user's base currency, in minor units.
   * Null means "no sé cuánto costará" — the amount is always optional.
   */
  amountBaseMinor: number | null;
  done: boolean;
  doneAt: string | null;
  /** Set when the completed item was registered as a real transaction. */
  convertedTransactionId: string | null;
  createdAt: string;
}

export interface CreatePendingItemDTO {
  kind: PendingItemKind;
  name: string;
  amountBaseMinor?: number | null;
}

export interface UpdatePendingItemDTO {
  done?: boolean;
  convertedTransactionId?: string | null;
}

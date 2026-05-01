/**
 * Transfers Repository Projections
 *
 * Transfers are represented as pairs of transactions (TRANSFER_OUT and TRANSFER_IN).
 * The listByUserId() method queries transactions table with related account name.
 * LIST queries include essential fields only (~650 bytes per transfer pair);
 * The delete operation only needs transaction IDs (minimal projection).
 *
 * Money logic preservation: amountMinor, currencyCode, exchangeRate always included.
 * Transfer metadata (description, date) always included for list queries.
 */

/**
 * Essential fields for transaction list queries in transfer context (~650 bytes per pair)
 * Includes all necessary data for transfer list display and balance calculations.
 * Omits: tags, note, settledAt, debtDirection, debtStatus (fetch only on detail view)
 */
export const TRANSFER_TRANSACTION_LIST_PROJECTION = [
  'id', // Transaction ID
  'type', // TRANSFER_OUT or TRANSFER_IN
  'account_id', // Account relationship
  'category_id', // Category (null for transfers)
  'currency_code', // *** Money field - MUST include ***
  'amount_minor', // *** Money field - MUST include (transaction currency) ***
  'amount_base_minor', // *** Money field - MUST include (base currency conversion) ***
  'exchange_rate', // *** Money field - MUST include (conversion rate) ***
  'date', // Transaction date
  'description', // Transaction description
  'transfer_id', // Link to transfer record
  'pending', // Whether transaction is pending
  'is_debt', // Debt flag
  'counterparty_name', // Counterparty name for transfers
  'created_at', // Transaction creation timestamp
  'updated_at', // Last update timestamp
] as const;

/**
 * Minimal projection for delete operations
 * Only needs transaction IDs to delete transfer records
 */
export const TRANSFER_TRANSACTION_DELETE_PROJECTION = [
  'id', // Transaction ID (only field needed for deletion)
] as const;

/**
 * Account name projection (for related account data)
 * Used in the nested select for account:accounts(name)
 */
export const TRANSFER_ACCOUNT_NAME_PROJECTION = [
  'name', // Account name
] as const;

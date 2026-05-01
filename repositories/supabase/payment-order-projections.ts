/**
 * Payment Order Repository Projections
 *
 * Defines column selections for list vs. detail queries.
 * LIST queries include essential fields only (12 fields, ~450 bytes/order);
 * DETAIL queries retrieve all columns with select('*').
 *
 * Money logic preservation: amountMinor, currencyCode always included.
 * Status & audit fields always included for list queries.
 * Receipt & admin notes deferred to detail queries.
 */

/**
 * Essential fields for list queries (~450 bytes per record)
 * Includes all necessary data for list/table display and pagination.
 * Omits: receiptUrl, receiptFilename, adminNotes (fetch only on detail view)
 */
export const PAYMENT_ORDER_LIST_PROJECTION = [
  'id', // Primary key
  'user_id', // User relationship
  'amount_minor', // *** Money field - MUST include ***
  'currency_code', // *** Money field - MUST include ***
  'description', // Optional order description
  'status', // Order status (pending, pending_review, approved, rejected, expired)
  'reviewed_by', // Reviewer user ID (for approved/rejected orders)
  'reviewed_at', // Review timestamp
  'transaction_id', // Linked transaction ID (after approval)
  'created_at', // Order creation timestamp
  'updated_at', // Last update timestamp
] as const;

/**
 * Detail projection (all columns)
 * Used by findById and detail view routes.
 * Includes receipt URLs, filenames, and admin notes.
 */
export const PAYMENT_ORDER_DETAIL_PROJECTION = [
  ...PAYMENT_ORDER_LIST_PROJECTION,
  'receipt_url',
  'receipt_filename',
  'admin_notes',
] as const;

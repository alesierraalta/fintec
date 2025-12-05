/**
 * Payment Order domain types
 */

export type PaymentOrderStatus = 
  | 'pending'           // Order created, waiting for receipt
  | 'pending_review'    // Receipt uploaded, waiting for admin review
  | 'approved'          // Approved by admin, transaction created
  | 'rejected'          // Rejected by admin
  | 'expired';          // Order expired (optional)

export interface PaymentOrder {
  id: string;
  userId: string;
  amountMinor: number;
  currencyCode: string;
  description?: string;
  status: PaymentOrderStatus;
  receiptUrl?: string;
  receiptFilename?: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentOrderDTO {
  amountMinor: number;
  currencyCode?: string;
  description?: string;
}

export interface UpdatePaymentOrderDTO {
  description?: string;
  receiptUrl?: string;
  receiptFilename?: string;
}

export interface ApprovePaymentOrderDTO {
  accountId?: string; // Optional account ID, will use first active account if not provided
  adminNotes?: string;
}

export interface RejectPaymentOrderDTO {
  reason: string;
  adminNotes?: string;
}




/**
 * Payment Order Service
 * Handles business logic for payment orders
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { logger } from '@/lib/utils/logger';
import type { 
  PaymentOrder, 
  CreatePaymentOrderDTO, 
  UpdatePaymentOrderDTO,
  ApprovePaymentOrderDTO,
  RejectPaymentOrderDTO 
} from '@/types/payment-order';

const supabase = createSupabaseServiceClient();

/**
 * Create a new payment order
 */
export async function createOrder(
  userId: string,
  data: CreatePaymentOrderDTO
): Promise<PaymentOrder> {
  try {
    const { data: order, error } = await (supabase as any)
      .from('payment_orders')
      .insert({
        user_id: userId,
        amount_minor: data.amountMinor,
        currency_code: data.currencyCode || 'VES',
        description: data.description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('[OrderService] Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  } catch (error) {
    logger.error('[OrderService] Error in createOrder:', error);
    throw error;
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(
  orderId: string,
  userId?: string
): Promise<PaymentOrder | null> {
  try {
    let query = (supabase as any)
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    // If userId provided, filter by user (for non-admin users)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logger.error('[OrderService] Error getting order:', error);
      throw new Error(`Failed to get order: ${error.message}`);
    }

    return data ? mapSupabaseToDomain(data) : null;
  } catch (error) {
    logger.error('[OrderService] Error in getOrderById:', error);
    throw error;
  }
}

/**
 * List orders for a user
 */
export async function listUserOrders(
  userId: string,
  status?: string
): Promise<PaymentOrder[]> {
  try {
    let query = (supabase as any)
      .from('payment_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[OrderService] Error listing orders:', error);
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    return (data || []).map(mapSupabaseToDomain);
  } catch (error) {
    logger.error('[OrderService] Error in listUserOrders:', error);
    throw error;
  }
}

/**
 * List all orders (admin only)
 */
export async function listAllOrders(
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaymentOrder[]> {
  try {
    let query = (supabase as any)
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[OrderService] Error listing all orders:', error);
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    return (data || []).map(mapSupabaseToDomain);
  } catch (error) {
    logger.error('[OrderService] Error in listAllOrders:', error);
    throw error;
  }
}

/**
 * Update order (for uploading receipt)
 */
export async function updateOrder(
  orderId: string,
  userId: string,
  data: UpdatePaymentOrderDTO
): Promise<PaymentOrder> {
  try {
    // Verify order belongs to user and is in pending status
    const existingOrder = await getOrderById(orderId, userId);
    
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    if (existingOrder.status !== 'pending') {
      throw new Error('Order can only be updated when in pending status');
    }

    const updateData: any = {};
    
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    
    if (data.receiptUrl !== undefined) {
      updateData.receipt_url = data.receiptUrl;
      updateData.receipt_filename = data.receiptFilename || null;
      // Change status to pending_review when receipt is uploaded
      updateData.status = 'pending_review';
    }

    const { data: order, error } = await (supabase as any)
      .from('payment_orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('[OrderService] Error updating order:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  } catch (error) {
    logger.error('[OrderService] Error in updateOrder:', error);
    throw error;
  }
}

/**
 * Approve order (admin only)
 * Creates transaction automatically
 */
export async function approveOrder(
  orderId: string,
  adminId: string,
  data: ApprovePaymentOrderDTO = {}
): Promise<PaymentOrder> {
  try {
    // Call RPC function to approve and create transaction atomically
    const { data: order, error } = await (supabase as any).rpc('approve_payment_order', {
      p_order_id: orderId,
      p_admin_id: adminId,
      p_account_id: data.accountId || null,
    });

    if (error) {
      logger.error('[OrderService] Error approving order:', error);
      throw new Error(`Failed to approve order: ${error.message}`);
    }

      // Update admin notes if provided
      if (data.adminNotes) {
        const { error: updateError } = await (supabase as any)
          .from('payment_orders')
          .update({ admin_notes: data.adminNotes })
          .eq('id', orderId);

      if (updateError) {
        logger.warn('[OrderService] Error updating admin notes:', updateError);
        // Don't fail the approval if notes update fails
      }
    }

    return mapSupabaseToDomain(order);
  } catch (error) {
    logger.error('[OrderService] Error in approveOrder:', error);
    throw error;
  }
}

/**
 * Reject order (admin only)
 */
export async function rejectOrder(
  orderId: string,
  adminId: string,
  data: RejectPaymentOrderDTO
): Promise<PaymentOrder> {
  try {
    const { data: order, error } = await (supabase as any)
      .from('payment_orders')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: data.adminNotes || data.reason || null,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      logger.error('[OrderService] Error rejecting order:', error);
      throw new Error(`Failed to reject order: ${error.message}`);
    }

    return mapSupabaseToDomain(order);
  } catch (error) {
    logger.error('[OrderService] Error in rejectOrder:', error);
    throw error;
  }
}

/**
 * Upload receipt file to Supabase Storage
 */
export async function uploadReceipt(
  orderId: string,
  userId: string,
  file: File
): Promise<{ url: string; path: string }> {
  try {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only images (JPG, PNG, WebP) and PDF are allowed');
    }

    // Generate file path: payment-receipts/{user_id}/{order_id}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${orderId}/${timestamp}-${sanitizedFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await (supabase as any).storage
      .from('payment-receipts')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('[OrderService] Error uploading receipt:', uploadError);
      throw new Error(`Failed to upload receipt: ${uploadError.message}`);
    }

    // Get public URL (signed URL for private bucket)
    const { data: urlData } = (supabase as any).storage
      .from('payment-receipts')
      .getPublicUrl(filePath);

    // For private buckets, we need to use signed URLs
    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await (supabase as any).storage
      .from('payment-receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    if (signedUrlError) {
      logger.warn('[OrderService] Error creating signed URL, using public URL:', signedUrlError);
    }

    return {
      url: signedUrlData?.signedUrl || urlData.publicUrl,
      path: uploadData.path,
    };
  } catch (error) {
    logger.error('[OrderService] Error in uploadReceipt:', error);
    throw error;
  }
}

/**
 * Map Supabase row to domain model
 */
function mapSupabaseToDomain(row: any): PaymentOrder {
  return {
    id: row.id,
    userId: row.user_id,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    description: row.description || undefined,
    status: row.status,
    receiptUrl: row.receipt_url || undefined,
    receiptFilename: row.receipt_filename || undefined,
    adminNotes: row.admin_notes || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    transactionId: row.transaction_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


/**
 * Payment Order Service
 * Handles business logic for payment orders
 */

import { createServiceClient } from '@/lib/supabase/admin';
import { createServerPaymentOrdersRepository } from '@/repositories/factory';
import { logger } from '@/lib/utils/logger';
import type {
  PaymentOrder,
  CreatePaymentOrderDTO,
  UpdatePaymentOrderDTO,
  ApprovePaymentOrderDTO,
  RejectPaymentOrderDTO,
} from '@/types/payment-order';

const supabase = createServiceClient();

function getPaymentOrdersRepository() {
  return createServerPaymentOrdersRepository({
    serviceSupabase: supabase as any,
  });
}

/**
 * Create a new payment order
 */
export async function createOrder(
  userId: string,
  data: CreatePaymentOrderDTO
): Promise<PaymentOrder> {
  try {
    // Validate payment method
    if (!data.paymentMethod) {
      throw new Error('Payment method is required');
    }

    const validMethods = ['ubii', 'pagoflash', 'binance_pay'];
    if (!validMethods.includes(data.paymentMethod)) {
      throw new Error(`Invalid payment method: ${data.paymentMethod}`);
    }

    return await getPaymentOrdersRepository().create(userId, data);
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
    return await getPaymentOrdersRepository().findById(orderId, userId);
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
    return await getPaymentOrdersRepository().listByUserId(userId, status);
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
    return await getPaymentOrdersRepository().listAll(status, limit, offset);
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

    return await getPaymentOrdersRepository().updateForUser(
      orderId,
      userId,
      data
    );
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
    const paymentOrdersRepository = getPaymentOrdersRepository();
    const order = await paymentOrdersRepository.approve(orderId, adminId, data);

    // Update admin notes if provided
    if (data.adminNotes) {
      try {
        await paymentOrdersRepository.setAdminNotes(orderId, data.adminNotes);
      } catch (updateError) {
        logger.warn('[OrderService] Error updating admin notes:', updateError);
        // Don't fail the approval if notes update fails
      }
    }

    return order;
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
    return await getPaymentOrdersRepository().reject(orderId, adminId, data);
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

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        'Invalid file type. Only images (JPG, PNG, WebP) and PDF are allowed'
      );
    }

    // Generate file path: payment-receipts/{user_id}/{order_id}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${orderId}/${timestamp}-${sanitizedFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await (
      supabase as any
    ).storage
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
    const { data: signedUrlData, error: signedUrlError } = await (
      supabase as any
    ).storage
      .from('payment-receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    if (signedUrlError) {
      logger.warn(
        '[OrderService] Error creating signed URL, using public URL:',
        signedUrlError
      );
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

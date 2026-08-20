import type {
  Notification,
  CreateNotificationDTO,
} from '@/types/notifications';
import type { NotificationsRepository } from '@/repositories/contracts/notifications-repository';
import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { RequestContext } from '@/lib/cache/request-context';
import { NOTIFICATION_LIST_PROJECTION } from './notification-projections';

function toDomain(
  row: Database['public']['Tables']['notifications']['Row']
): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    is_read: row.is_read,
    action_url: row.action_url ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SupabaseNotificationsRepository
  implements NotificationsRepository
{
  private client: SupabaseClient<Database>;
  private readonly requestContext?: RequestContext;

  constructor(
    client?: SupabaseClient<Database>,
    requestContext?: RequestContext
  ) {
    this.client = client || (supabase as SupabaseClient<Database>);
    this.requestContext = requestContext;
  }

  private async requireUserId(): Promise<string> {
    if (this.requestContext) {
      return this.requestContext.userId;
    }

    const {
      data: { user },
    } = await this.client.auth.getUser();

    if (!user?.id) {
      throw new Error('Unauthorized');
    }

    return user.id;
  }

  private async assertUserScope(userId: string): Promise<string> {
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const authUserId = await this.requireUserId();
    if (userId !== authUserId) {
      throw new Error('Unauthorized');
    }

    return authUserId;
  }

  async findByUserId(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    const scopedUserId = await this.assertUserScope(userId);

    const { data, error } = await this.client
      .from('notifications')
      .select(NOTIFICATION_LIST_PROJECTION)
      .eq('user_id', scopedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch notifications');
    }

    return (data || []).map(toDomain);
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const scopedUserId = await this.assertUserScope(userId);

    const { data, error } = await this.client
      .from('notifications')
      .select(NOTIFICATION_LIST_PROJECTION)
      .eq('user_id', scopedUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch unread notifications');
    }

    return (data || []).map(toDomain);
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const scopedUserId = await this.assertUserScope(userId);

    const { count, error } = await this.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', scopedUserId)
      .eq('is_read', false);

    if (error) {
      throw new Error('Failed to count unread notifications');
    }

    return count || 0;
  }

  async findById(id: string): Promise<Notification | null> {
    const userId = await this.requireUserId();

    const { data, error } = await this.client
      .from('notifications')
      .select(NOTIFICATION_LIST_PROJECTION)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error('Failed to fetch notification');
    }

    return data ? toDomain(data) : null;
  }

  async create(
    userId: string,
    notificationData: CreateNotificationDTO
  ): Promise<Notification> {
    const scopedUserId = await this.assertUserScope(userId);

    const { data, error } = await this.client
      .from('notifications')
      .insert([
        {
          user_id: scopedUserId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          action_url: notificationData.action_url ?? null,
          is_read: false,
        },
      ])
      .select(NOTIFICATION_LIST_PROJECTION)
      .single();

    if (error) {
      throw new Error('Failed to create notification');
    }

    return toDomain(data);
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const userId = await this.requireUserId();

    const { data, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select(NOTIFICATION_LIST_PROJECTION)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error('Failed to mark notification as read');
    }

    return data ? toDomain(data) : null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const scopedUserId = await this.assertUserScope(userId);

    const { error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', scopedUserId)
      .eq('is_read', false);

    if (error) {
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async delete(id: string): Promise<boolean> {
    const userId = await this.requireUserId();

    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return false;
    }

    return true;
  }

  async deleteAllRead(userId: string): Promise<void> {
    const scopedUserId = await this.assertUserScope(userId);

    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('user_id', scopedUserId)
      .eq('is_read', true);

    if (error) {
      throw new Error('Failed to delete read notifications');
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const scopedUserId = await this.assertUserScope(userId);

    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('user_id', scopedUserId);

    if (error) {
      throw new Error('Failed to delete notifications');
    }
  }
}

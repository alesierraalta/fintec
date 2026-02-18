import type {
  Notification,
  CreateNotificationDTO,
} from '@/types/notifications';
import type { NotificationsRepository } from '@/repositories/contracts/notifications-repository';
import { supabase } from './client';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseNotificationsRepository
  implements NotificationsRepository
{
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  private async requireUserId(): Promise<string> {
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
      .select('*')
      .eq('user_id', scopedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch notifications');
    }

    return data || [];
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const scopedUserId = await this.assertUserScope(userId);

    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', scopedUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch unread notifications');
    }

    return data || [];
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const scopedUserId = await this.assertUserScope(userId);

    const { count, error } = await this.client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
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
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error('Failed to fetch notification');
    }

    return data;
  }

  async create(
    userId: string,
    notificationData: CreateNotificationDTO
  ): Promise<Notification> {
    const scopedUserId = await this.assertUserScope(userId);

    const { data, error } = await (this.client.from('notifications') as any)
      .insert([
        {
          user_id: scopedUserId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          action_url: notificationData.action_url,
          is_read: false,
        },
      ] as any)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create notification');
    }

    return data;
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const userId = await this.requireUserId();

    const { data, error } = await (this.client.from('notifications') as any)
      .update({ is_read: true } as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error('Failed to mark notification as read');
    }

    return data;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const scopedUserId = await this.assertUserScope(userId);

    const { error } = await (this.client.from('notifications') as any)
      .update({ is_read: true } as any)
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

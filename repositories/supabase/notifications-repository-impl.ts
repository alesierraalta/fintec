import type { Notification, CreateNotificationDTO, UpdateNotificationDTO } from '@/types/notifications';
import type { NotificationsRepository } from '@/repositories/contracts/notifications-repository';
import { supabase } from './client';

export class SupabaseNotificationsRepository implements NotificationsRepository {
  
  async findByUserId(userId: string, limit: number = 50): Promise<Notification[]> {
    // Handle invalid user IDs gracefully
    if (!userId || userId === 'local-user' || userId === 'undefined' || userId === 'null') {
      return []; // Return empty array for invalid user IDs
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch notifications');
    }

    return data || [];
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    // Handle invalid user IDs gracefully
    if (!userId || userId === 'local-user' || userId === 'undefined' || userId === 'null') {
      return []; // Return empty array for invalid user IDs
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch unread notifications');
    }

    return data || [];
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    // Handle invalid user IDs gracefully
    if (!userId || userId === 'local-user' || userId === 'undefined' || userId === 'null') {
      return 0; // Return 0 count for invalid user IDs
    }
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return 0;
    }

    return count || 0;
  }

  async findById(id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error('Failed to fetch notification');
    }

    return data;
  }

  async create(userId: string, notificationData: CreateNotificationDTO): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        action_url: notificationData.action_url,
        is_read: false
      }])
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create notification');
    }

    return data;
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
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
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      return false;
    }

    return true;
  }

  async deleteAllRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) {
      throw new Error('Failed to delete read notifications');
    }
  }
}




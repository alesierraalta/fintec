import { NotificationsRepository } from '@/repositories/contracts';
import type { Notification, CreateNotificationDTO } from '@/types/notifications';

export class LocalNotificationsRepository implements NotificationsRepository {
  private notifications: Notification[] = [];

  async findByUserId(userId: string, limit?: number): Promise<Notification[]> {
    const userNotifications = this.notifications.filter(n => n.user_id === userId);
    return limit ? userNotifications.slice(0, limit) : userNotifications;
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return this.notifications.filter(n => n.user_id === userId && !n.is_read);
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.notifications.filter(n => n.user_id === userId && !n.is_read).length;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find(n => n.id === id) || null;
  }

  async create(userId: string, data: CreateNotificationDTO): Promise<Notification> {
    const newNotification: Notification = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_read: false,
      type: data.type || 'info',
    };
    
    this.notifications.push(newNotification);
    return newNotification;
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.is_read = true;
      notification.updated_at = new Date().toISOString();
      return notification;
    }
    return null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.notifications
      .filter(n => n.user_id === userId)
      .forEach(n => {
        n.is_read = true;
        n.updated_at = new Date().toISOString();
      });
  }

  async delete(id: string): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  async deleteAllRead(userId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => !(n.user_id === userId && n.is_read));
  }
}

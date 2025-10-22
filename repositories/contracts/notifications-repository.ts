import type { Notification, CreateNotificationDTO, UpdateNotificationDTO } from '@/types/notifications';

export interface NotificationsRepository {
  // Read operations
  findByUserId(userId: string, limit?: number): Promise<Notification[]>;
  findUnreadByUserId(userId: string): Promise<Notification[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  findById(id: string): Promise<Notification | null>;

  // Write operations
  create(userId: string, data: CreateNotificationDTO): Promise<Notification>;
  markAsRead(id: string): Promise<Notification | null>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteAllRead(userId: string): Promise<void>;
}




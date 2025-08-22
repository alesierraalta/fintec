export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationDTO {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  action_url?: string;
}

export interface UpdateNotificationDTO {
  is_read?: boolean;
}




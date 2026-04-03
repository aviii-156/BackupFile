import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async getNotifications(page = 1, limit = 20) {
    return apiClient.get<{
      notifications: AppNotification[];
      unreadCount: number;
      pagination: { currentPage: number; totalPages: number; totalItems: number };
    }>(`${API_CONFIG.API.NOTIFICATIONS.LIST}?page=${page}&limit=${limit}`);
  },

  async getUnreadCount() {
    return apiClient.get<{ count: number }>(API_CONFIG.API.NOTIFICATIONS.UNREAD_COUNT);
  },

  async markAsRead(id: string) {
    return apiClient.put(API_CONFIG.API.NOTIFICATIONS.MARK_READ(id), {});
  },

  async markAllAsRead() {
    return apiClient.put(API_CONFIG.API.NOTIFICATIONS.MARK_ALL_READ, {});
  },
};

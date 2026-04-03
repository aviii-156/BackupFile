/**
 * Base API Client
 * Handles all HTTP requests with error handling, retries, and auth
 */

import { API_CONFIG, REQUEST_CONFIG, getAuthHeader, STORAGE_KEYS } from './api-config';
import type { ApiResponse } from '@/types/api-types';

class ApiClient {
  private baseURL: string;
  private aiBaseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_API_URL;
    this.aiBaseURL = API_CONFIG.BASE_AI_URL;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT);

      const authHeader = getAuthHeader();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeader,
        ...(options.headers as Record<string, string> || {}),
      };

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeout);

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed && retryCount === 0) {
          return this.request<T>(url, options, retryCount + 1);
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      // Retry on network errors
      if (retryCount < REQUEST_CONFIG.RETRY_ATTEMPTS && error.name === 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, REQUEST_CONFIG.RETRY_DELAY));
        return this.request<T>(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}${API_CONFIG.API.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Logout and clear storage
   */
  private logout() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    window.location.href = '/login';
  }

  // ==================== HTTP Methods ====================

  async get<T>(endpoint: string, useAI = false): Promise<ApiResponse<T>> {
    const baseURL = useAI ? this.aiBaseURL : this.baseURL;
    return this.request<T>(`${baseURL}${endpoint}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, useAI = false, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
    const baseURL = useAI ? this.aiBaseURL : this.baseURL;
    return this.request<T>(`${baseURL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: extraHeaders,
    });
  }

  async put<T>(endpoint: string, data?: any, useAI = false, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
    const baseURL = useAI ? this.aiBaseURL : this.baseURL;
    return this.request<T>(`${baseURL}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: extraHeaders,
    });
  }

  async delete<T>(endpoint: string, useAI = false): Promise<ApiResponse<T>> {
    const baseURL = useAI ? this.aiBaseURL : this.baseURL;
    return this.request<T>(`${baseURL}${endpoint}`, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData, useAI = false): Promise<ApiResponse<T>> {
    const baseURL = useAI ? this.aiBaseURL : this.baseURL;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_CONFIG.TIMEOUT * 2); // Double timeout for uploads

      const authHeader = getAuthHeader();
      const headers: Record<string, string> = {
        ...authHeader,
      };

      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

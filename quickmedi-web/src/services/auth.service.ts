/**
 * Auth Service
 * Handles authentication and authorization
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG, STORAGE_KEYS } from '@/lib/api-config';
import type { ApiResponse, User, Vendor, Admin, LoginRequest, RegisterPatientRequest, RegisterVendorRequest } from '@/types/api-types';

export const authService = {
  /**
   * Send OTP to email
   */
  async sendOTP(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(API_CONFIG.API.AUTH.SEND_OTP, { email });
  },

  /**
   * Verify OTP — returns tempToken (new user) or accessToken (existing user)
   */
  async verifyOTP(email: string, otp: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<any>(API_CONFIG.API.AUTH.VERIFY_OTP, { email, otp });
    if (response.success && response.data) {
      if (response.data.isNewUser && response.data.tempToken) {
        // New user — store temp token for registration step
        localStorage.setItem(STORAGE_KEYS.TEMP_TOKEN, response.data.tempToken);
      } else if (!response.data.isNewUser && response.data.accessToken) {
        // Existing user — store full session
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
        }
        const role = response.data.userType || 'patient';
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
        const userData = response.data.user || response.data.vendor;
        if (userData) {
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
      }
    }
    return response;
  },

  /**
   * Login with email + password (patients & vendors)
   */
  async loginWithPassword(email: string, password: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<any>(API_CONFIG.API.AUTH.LOGIN, { email, password });
    if (response.success && response.data) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
      const role = response.data.role || (response.data.vendor ? 'vendor' : 'patient');
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
      const userData = response.data.user || response.data.vendor;
      if (userData) {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      }
    }
    return response;
  },

  /**
   * Register patient (requires tempToken from verifyOTP)
   */
  async registerPatient(data: RegisterPatientRequest): Promise<ApiResponse<any>> {
    const tempToken = localStorage.getItem(STORAGE_KEYS.TEMP_TOKEN);
    const response = await apiClient.post<any>(
      API_CONFIG.API.AUTH.REGISTER_PATIENT,
      data,
      false,
      { Authorization: `Bearer ${tempToken}` }
    );
    if (response.success && response.data) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'patient');
      localStorage.removeItem(STORAGE_KEYS.TEMP_TOKEN);
    }
    return response;
  },

  /**
   * Register vendor (requires tempToken from verifyOTP) — sends multipart/form-data
   */
  async registerVendor(formData: FormData): Promise<ApiResponse<any>> {
    const tempToken = localStorage.getItem(STORAGE_KEYS.TEMP_TOKEN);
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_API_URL}${API_CONFIG.API.AUTH.REGISTER_VENDOR}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tempToken}` },
          body: formData,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: data.message || `HTTP ${response.status}` } as any;
      }
      if (data.success && data.data) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.data.vendor));
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'vendor');
        localStorage.removeItem(STORAGE_KEYS.TEMP_TOKEN);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' } as any;
    }
  },

  /**
   * Admin login (email + password)
   */
  async adminLogin(email: string, password: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<any>(API_CONFIG.API.AUTH.ADMIN_LOGIN, { email, password });
    if (response.success && response.data && !response.data.requires2FA) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.admin));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'admin');
    }
    return response;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Snapshot token before clearing so we can still send it to the server
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // Clear local state immediately — user is logged out regardless of API outcome
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.TEMP_TOKEN);

    // Best-effort server invalidation (fire and forget)
    if (token) {
      try {
        await apiClient.post(API_CONFIG.API.AUTH.LOGOUT);
      } catch {
        // Ignore — local logout already complete
      }
    }
  },

  /**
   * Check vendor status
   */
  async checkVendorStatus(): Promise<ApiResponse<{ status: string; vendor: Vendor }>> {
    return apiClient.get(API_CONFIG.API.AUTH.VENDOR_STATUS);
  },

  /**
   * Get current user from storage
   */
  getCurrentUser(): User | Vendor | Admin | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Get current user role
   */
  getCurrentRole(): 'patient' | 'vendor' | 'admin' | null {
    return localStorage.getItem(STORAGE_KEYS.USER_ROLE) as any;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  /**
   * Request a password reset link (works for user, vendor, admin)
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(API_CONFIG.API.AUTH.FORGOT_PASSWORD, { email });
  },

  /**
   * Reset password using the token from the reset email
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(API_CONFIG.API.AUTH.RESET_PASSWORD, { token, password });
  },
};

/**
 * Patient Service
 * Handles patient profile and related data
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, User, Address, EmergencyContact, MedicalInfo } from '@/types/api-types';

export const patientService = {
  /**
   * Get patient dashboard data
   */
  async getDashboard(): Promise<ApiResponse<{
    user: User;
    stats: {
      totalOrders: number;
      activeReminders: number;
      savedAmount: number;
      prescriptions: number;
    };
    recentOrders: any[];
    upcomingReminders: any[];
  }>> {
    return apiClient.get(API_CONFIG.API.PATIENT.DASHBOARD);
  },

  /**
   * Get patient profile
   */
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get(API_CONFIG.API.PATIENT.PROFILE);
  },

  /**
   * Update patient profile
   */
  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiClient.put(API_CONFIG.API.PATIENT.PROFILE, data);
  },

  /**
   * Get addresses
   */
  async getAddresses(): Promise<ApiResponse<Address[]>> {
    return apiClient.get(API_CONFIG.API.PATIENT.ADDRESSES);
  },

  /**
   * Add address
   */
  async addAddress(address: Omit<Address, '_id'>): Promise<ApiResponse<Address>> {
    return apiClient.post(API_CONFIG.API.PATIENT.ADDRESSES, address);
  },

  /**
   * Update address
   */
  async updateAddress(addressId: string, address: Partial<Address>): Promise<ApiResponse<Address>> {
    return apiClient.put(`${API_CONFIG.API.PATIENT.ADDRESSES}/${addressId}`, address);
  },

  /**
   * Delete address
   */
  async deleteAddress(addressId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`${API_CONFIG.API.PATIENT.ADDRESSES}/${addressId}`);
  },

  /**
   * Set default address
   */
  async setDefaultAddress(addressId: string): Promise<ApiResponse<Address>> {
    return apiClient.put(`${API_CONFIG.API.PATIENT.ADDRESSES}/${addressId}/default`, {});
  },

  /**
   * Get savings summary
   */
  async getSavingsSummary(): Promise<ApiResponse<{
    totalSaved: number;
    ordersCount: number;
    averageSavings: number;
    monthlySavings: Array<{
      month: string;
      amount: number;
    }>;
  }>> {
    return apiClient.get(API_CONFIG.API.PATIENT.SAVINGS);
  },

  /**
   * Update emergency contacts
   */
  async updateEmergencyContacts(contacts: EmergencyContact[]): Promise<ApiResponse<{ emergencyContacts: EmergencyContact[] }>> {
    return apiClient.put(API_CONFIG.API.PATIENT.EMERGENCY_CONTACTS, { emergencyContacts: contacts });
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse<null>> {
    return apiClient.put(API_CONFIG.API.PATIENT.CHANGE_PASSWORD, { currentPassword, newPassword, confirmPassword });
  },

  /**
   * Update medical info
   */
  async updateMedicalInfo(medicalInfo: MedicalInfo): Promise<ApiResponse<User>> {
    return apiClient.put(API_CONFIG.API.PATIENT.MEDICAL_INFO, medicalInfo);
  },
};

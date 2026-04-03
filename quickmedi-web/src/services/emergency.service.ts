/**
 * Emergency Service
 * Handles emergency requests and alerts
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, Emergency, TriggerEmergencyRequest } from '@/types/api-types';

export const emergencyService = {
  /**
   * Trigger emergency alert
   */
  async triggerEmergency(data: TriggerEmergencyRequest): Promise<ApiResponse<Emergency>> {
    return apiClient.post(API_CONFIG.API.EMERGENCY.TRIGGER, data);
  },

  /**
   * Request ambulance
   */
  async requestAmbulance(latitude: number, longitude: number, note?: string): Promise<ApiResponse<Emergency>> {
    return apiClient.post(API_CONFIG.API.EMERGENCY.AMBULANCE, {
      latitude,
      longitude,
      note,
    });
  },

  /**
   * Alert family
   */
  async alertFamily(latitude: number, longitude: number, note?: string): Promise<ApiResponse<Emergency>> {
    return apiClient.post(API_CONFIG.API.EMERGENCY.FAMILY, {
      latitude,
      longitude,
      note,
    });
  },

  /**
   * Get emergency status
   */
  async getEmergencyStatus(emergencyId: string): Promise<ApiResponse<Emergency>> {
    return apiClient.get(API_CONFIG.API.EMERGENCY.STATUS(emergencyId));
  },

  /**
   * Resolve emergency
   */
  async resolveEmergency(emergencyId: string): Promise<ApiResponse<Emergency>> {
    return apiClient.put(API_CONFIG.API.EMERGENCY.RESOLVE(emergencyId), {});
  },

  /**
   * Respond to emergency (vendor)
   */
  async respondToEmergency(emergencyId: string, message: string): Promise<ApiResponse<Emergency>> {
    return apiClient.post(API_CONFIG.API.EMERGENCY.RESPOND(emergencyId), { message });
  },
};

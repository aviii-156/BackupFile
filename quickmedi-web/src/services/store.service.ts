/**
 * Store/Vendor Service
 * Handles store and vendor-related operations
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, Vendor, VendorInventory } from '@/types/api-types';

export const storeService = {
  /**
   * Get nearby stores
   */
  async getNearbyStores(
    latitude: number,
    longitude: number,
    radius: number = 5
  ): Promise<ApiResponse<Vendor[]>> {
    return apiClient.get(
      `${API_CONFIG.API.STORE.NEARBY}?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
    );
  },

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<ApiResponse<Vendor>> {
    return apiClient.get(API_CONFIG.API.STORE.GET_BY_ID(storeId));
  },

  /**
   * Get store inventory
   */
  async getStoreInventory(storeId: string): Promise<ApiResponse<VendorInventory[]>> {
    return apiClient.get(API_CONFIG.API.STORE.INVENTORY(storeId));
  },

  /**
   * Compare medicine prices across stores
   */
  async comparePrices(
    medicineId: string,
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<Array<{
    vendor: Vendor;
    inventory: VendorInventory;
    distance: number;
  }>>> {
    return apiClient.get(
      `${API_CONFIG.API.STORE.COMPARE}?medicineId=${medicineId}&latitude=${latitude}&longitude=${longitude}`
    );
  },
};

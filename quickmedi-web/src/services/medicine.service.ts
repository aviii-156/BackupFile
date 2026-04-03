/**
 * Medicine Service
 * Handles medicine-related API calls to both Node API and Python AI
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, Medicine } from '@/types/api-types';

// AI Medicine Response Types
interface AIMedicineSearchResult {
  name: string;
  pack_size_label: string;
  manufacturer_name: string;
  price?: number;
  short_composition?: string;
  is_discontinued?: string;
  score?: number;
}

interface AIAlternative {
  name: string;
  price: number;
  savings: number;
  pack_size: string;
  manufacturer: string;
}

export const medicineService = {
  /**
   * Search medicines from Node API (MongoDB)
   */
  async searchMedicines(query: string): Promise<ApiResponse<Medicine[]>> {
    return apiClient.get(`${API_CONFIG.API.MEDICINE.SEARCH}?query=${encodeURIComponent(query)}`);
  },

  /**
   * Get medicine by ID from Node API
   */
  async getMedicineById(id: string): Promise<ApiResponse<Medicine>> {
    return apiClient.get(API_CONFIG.API.MEDICINE.GET_BY_ID(id));
  },

  /**
   * Get medicine alternatives from Node API
   */
  async getMedicineAlternatives(id: string): Promise<ApiResponse<Medicine[]>> {
    return apiClient.get(API_CONFIG.API.MEDICINE.ALTERNATIVES(id));
  },

  /**
   * Search medicines from AI service (239k+ database)
   */
  async searchMedicinesAI(medicineName: string, maxResults: number = 10): Promise<ApiResponse<AIMedicineSearchResult[]>> {
    return apiClient.post(
      API_CONFIG.AI.MEDICINE.SEARCH,
      { medicine_name: medicineName, max_results: maxResults },
      true // useAI flag
    );
  },

  /**
   * Get medicine by name from AI service
   */
  async getMedicineByNameAI(medicineName: string, maxResults: number = 10): Promise<ApiResponse<AIMedicineSearchResult[]>> {
    return apiClient.get(
      `${API_CONFIG.AI.MEDICINE.GET_BY_NAME(medicineName)}?max_results=${maxResults}`,
      true
    );
  },

  /**
   * Find cheaper alternatives using AI
   */
  async findAlternatives(medicineName: string, maxResults: number = 5): Promise<ApiResponse<AIAlternative[]>> {
    return apiClient.post(
      API_CONFIG.AI.MEDICINE.ALTERNATIVES,
      { medicine_name: medicineName, max_results: maxResults },
      true
    );
  },

  /**
   * Calculate savings between medicines
   */
  async calculateSavings(originalMedicine: string, alternativeMedicine: string): Promise<ApiResponse<{
    original: AIMedicineSearchResult;
    alternative: AIMedicineSearchResult;
    savings: number;
    percentage: number;
  }>> {
    return apiClient.post(
      API_CONFIG.AI.MEDICINE.SAVINGS,
      { original_medicine: originalMedicine, alternative_medicine: alternativeMedicine },
      true
    );
  },

  /**
   * Get medicine info from AI chatbot
   */
  async getMedicineInfo(medicineName: string): Promise<ApiResponse<{
    medicine: string;
    info: string;
  }>> {
    return apiClient.post(
      API_CONFIG.AI.CHATBOT.MEDICINE_INFO,
      { medicine_name: medicineName },
      true
    );
  },
};

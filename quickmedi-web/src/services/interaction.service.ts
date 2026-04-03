/**
 * Interaction Service
 * Handles drug interaction checking using AI service
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse } from '@/types/api-types';

// AI Interaction Types
interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
}

interface DuplicateCheck {
  medicine: string;
  is_duplicate: boolean;
  duplicate_of?: string;
  reason?: string;
}

interface ComprehensiveCheck {
  interactions: DrugInteraction[];
  duplicates: DuplicateCheck[];
  warnings: string[];
  safe_to_take: boolean;
}

export const interactionService = {
  /**
   * Check drug-drug interactions (382k+ database)
   */
  async checkDrugInteractions(medicines: string[]): Promise<ApiResponse<DrugInteraction[]>> {
    return apiClient.post(
      API_CONFIG.AI.INTERACTION.CHECK_DRUGS,
      { medicines },
      true
    );
  },

  /**
   * Check specific interaction between two medicines
   */
  async checkSpecificInteraction(medicine1: string, medicine2: string): Promise<ApiResponse<DrugInteraction>> {
    return apiClient.get(
      API_CONFIG.AI.INTERACTION.CHECK_SPECIFIC(medicine1, medicine2),
      true
    );
  },

  /**
   * Check for duplicate medicines
   */
  async checkDuplicates(medicines: string[]): Promise<ApiResponse<DuplicateCheck[]>> {
    return apiClient.post(
      API_CONFIG.AI.INTERACTION.CHECK_DUPLICATES,
      { medicines },
      true
    );
  },

  /**
   * Comprehensive check (interactions + duplicates + safety)
   */
  async comprehensiveCheck(
    medicines: string[],
    userConditions?: string[],
    userAllergies?: string[]
  ): Promise<ApiResponse<ComprehensiveCheck>> {
    return apiClient.post(
      API_CONFIG.AI.INTERACTION.COMPREHENSIVE,
      {
        medicines,
        user_conditions: userConditions,
        user_allergies: userAllergies,
      },
      true
    );
  },
};

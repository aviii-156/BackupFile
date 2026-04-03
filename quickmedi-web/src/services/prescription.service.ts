/**
 * OCR/Prescription Service
 * Handles prescription upload and OCR processing
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, Prescription } from '@/types/api-types';

// OCR Response Types
interface OCRResult {
  extractedText: string;
  detectedMedicines: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    confidence: number;
  }>;
  doctorName?: string;
  prescriptionDate?: string;
  validUntil?: string;
}

export const prescriptionService = {
  /**
   * Upload prescription to Node API
   */
  async uploadPrescription(file: File): Promise<ApiResponse<Prescription>> {
    const formData = new FormData();
    formData.append('prescription', file);
    return apiClient.upload(API_CONFIG.API.PRESCRIPTION.UPLOAD, formData);
  },

  /**
   * Upload and process prescription with AI OCR
   */
  async uploadPrescriptionAI(file: File): Promise<ApiResponse<OCRResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(API_CONFIG.AI.OCR.UPLOAD, formData, true);
  },

  /**
   * Extract medicines from prescription image
   */
  async extractMedicines(file: File): Promise<ApiResponse<{
    medicines: string[];
    count: number;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(API_CONFIG.AI.OCR.EXTRACT_MEDICINES, formData, true);
  },

  /**
   * Parse complete prescription details
   */
  async parsePrescription(file: File): Promise<ApiResponse<OCRResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(API_CONFIG.AI.OCR.PARSE_PRESCRIPTION, formData, true);
  },

  /**
   * Get prescription history
   */
  async getPrescriptionHistory(): Promise<ApiResponse<Prescription[]>> {
    return apiClient.get(API_CONFIG.API.PRESCRIPTION.HISTORY);
  },

  /**
   * Get prescription by ID
   */
  async getPrescriptionById(id: string): Promise<ApiResponse<Prescription>> {
    return apiClient.get(API_CONFIG.API.PRESCRIPTION.GET_BY_ID(id));
  },

  /**
   * Delete prescription
   */
  async deletePrescription(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(API_CONFIG.API.PRESCRIPTION.DELETE(id));
  },
};

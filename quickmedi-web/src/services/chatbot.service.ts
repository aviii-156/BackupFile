/**
 * Chatbot Service
 * Handles AI chatbot interactions
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, ChatSession, ChatMessage } from '@/types/api-types';

// Chatbot Types
interface ChatRequest {
  question: string;
  conversation_id?: string;
  user_context?: {
    currentMedications?: string[];
    recentSymptoms?: string[];
  };
}

interface ChatResponse {
  response: string;
  conversation_id: string;
  suggestions?: string[];
}

interface SymptomCheckResponse {
  symptoms: string[];
  recommendations: {
    generalAdvice: string[];
    possibleConditions: string[];
    whenToSeeDoctor: string[];
    emergencyWarning?: string;
  };
}

export const chatbotService = {
  /**
   * Send message to Node API chatbot
   */
  async sendMessage(message: string, sessionId?: string): Promise<ApiResponse<{
    response: string;
    sessionId: string;
  }>> {
    return apiClient.post(API_CONFIG.API.CHATBOT.MESSAGE, {
      message,
      sessionId,
    });
  },

  /**
   * Get chat sessions
   */
  async getChatSessions(): Promise<ApiResponse<ChatSession[]>> {
    return apiClient.get(API_CONFIG.API.CHATBOT.SESSIONS);
  },

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
    return apiClient.get(API_CONFIG.API.CHATBOT.HISTORY(sessionId));
  },

  /**
   * Delete chat session
   */
  async deleteSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(API_CONFIG.API.CHATBOT.DELETE(sessionId));
  },

  /**
   * Ask AI chatbot (AI service)
   */
  async askAI(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return apiClient.post(API_CONFIG.AI.CHATBOT.ASK, request, true);
  },

  /**
   * Get medicine information from AI
   */
  async getMedicineInfoAI(medicineName: string): Promise<ApiResponse<{
    medicine: string;
    info: string;
  }>> {
    return apiClient.post(
      API_CONFIG.AI.CHATBOT.MEDICINE_INFO,
      { medicine_name: medicineName },
      true
    );
  },

  /**
   * Check symptoms with AI
   */
  async checkSymptoms(symptoms: string[]): Promise<ApiResponse<SymptomCheckResponse>> {
    return apiClient.post(
      API_CONFIG.AI.CHATBOT.SYMPTOM_CHECK,
      { symptoms },
      true
    );
  },

  /**
   * Upload a prescription image in the chatbot context.
   * Returns extracted medicines + a system message for the chat.
   */
  async uploadPrescription(file: File, sessionId?: string): Promise<ApiResponse<{
    sessionId: string;
    imageUrl: string;
    systemMessage: string;
    extraction: {
      medicines: Array<Record<string, unknown>>;
      doctor_info: Record<string, unknown>;
      patient_info: Record<string, unknown>;
      diagnosis: string;
      warnings: string[];
      interaction_check: Record<string, unknown>;
    };
  }>> {
    const formData = new FormData();
    formData.append('image', file);
    if (sessionId) formData.append('sessionId', sessionId);
    return apiClient.upload(API_CONFIG.API.CHATBOT.PRESCRIPTION_UPLOAD, formData);
  },

  /**
   * Ask a question about the prescription stored in a chat session.
   */
  async askAboutPrescription(question: string, sessionId: string): Promise<ApiResponse<{
    sessionId: string;
    answer: string;
    suggestions: string[];
    followUpQuestions: string[];
    safetyWarnings: string[];
    interactionAlert: boolean;
  }>> {
    return apiClient.post(API_CONFIG.API.CHATBOT.PRESCRIPTION_ASK, { question, sessionId });
  },

  /**
   * Explain prescription with AI
   */
  async explainPrescription(prescriptionText: string): Promise<ApiResponse<{
    explanation: string;
    medicines: Array<{
      name: string;
      purpose: string;
      instructions: string;
    }>;
  }>> {
    return apiClient.post(
      API_CONFIG.AI.CHATBOT.EXPLAIN_PRESCRIPTION,
      { prescription_text: prescriptionText },
      true
    );
  },
};

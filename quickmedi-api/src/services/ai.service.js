import axios from 'axios';
import { config } from '../config/env.js';

/**
 * AI Service - Communicates with Python FastAPI backend
 */

const aiClient = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 60000, // 60 seconds
});

/**
 * Process prescription OCR
 */
export const processPrescriptionOCR = async (imageBase64) => {
  try {
    // imageBase64 can be a URL (from Cloudinary) or actual base64 string
    const isUrl = typeof imageBase64 === 'string' && imageBase64.startsWith('http');
    const payload = isUrl ? { imageUrl: imageBase64 } : { imageBase64 };
    const response = await aiClient.post('/api/ocr/prescription', payload);
    return response.data;
  } catch (error) {
    console.error('OCR Service Error:', error.message);
    throw new Error('Failed to process prescription image');
  }
};

/**
 * Search medicines from AI API
 */
export const searchMedicines = async (query) => {
  try {
    const response = await aiClient.get(`/api/medicines/search/${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('Medicine Search Error:', error.message);
    throw new Error('Failed to search medicines');
  }
};

/**
 * Get medicine details from AI API
 */
export const getMedicineDetails = async (medicineName) => {
  try {
    const response = await aiClient.get(`/api/medicines/details/${encodeURIComponent(medicineName)}`);
    return response.data;
  } catch (error) {
    console.error('Medicine Details Error:', error.message);
    throw new Error('Failed to get medicine details');
  }
};

/**
 * Get medicine alternatives from AI API
 */
export const getMedicineAlternativesAI = async (medicineName) => {
  try {
    const response = await aiClient.get(`/api/medicines/alternatives/${encodeURIComponent(medicineName)}`);
    return response.data;
  } catch (error) {
    console.error('Medicine Alternatives Error:', error.message);
    throw new Error('Failed to get medicine alternatives');
  }
};

/**
 * Get medicine alternatives
 */
export const getMedicineAlternatives = async (medicineName, composition) => {
  try {
    const response = await aiClient.post('/api/medicines/alternatives', {
      medicine_name: medicineName,
      max_results: 5,
    });
    return response.data;
  } catch (error) {
    console.error('Medicine Alternatives Error:', error.message);
    throw new Error('Failed to get medicine alternatives');
  }
};

/**
 * Check drug interactions
 */
export const checkDrugInteractions = async (medicines) => {
  try {
    const response = await aiClient.post('/api/interactions/check-drugs', {
      medicines,
    });
    return response.data;
  } catch (error) {
    console.error('Drug Interactions Error:', error.message);
    throw new Error('Failed to check drug interactions');
  }
};

/**
 * Check for duplicate medicines
 */
export const checkDuplicateMedicines = async (medicines) => {
  try {
    const response = await aiClient.post('/api/interactions/check-duplicates', {
      medicines,
    });
    return response.data;
  } catch (error) {
    console.error('Duplicate Check Error:', error.message);
    throw new Error('Failed to check for duplicates');
  }
};

/**
 * Perform safety check
 */
export const performSafetyCheck = async (medicines) => {
  try {
    const response = await aiClient.post('/api/ai/safety-check', {
      medicines,
    });
    return response.data;
  } catch (error) {
    console.error('Safety Check Error:', error.message);
    throw new Error('Failed to perform safety check');
  }
};

/**
 * Chat with AI assistant
 */
export const chatWithAI = async (message, language, conversationHistory = []) => {
  try {
    const response = await aiClient.post('/api/chatbot/ask', {
      question: message,
      user_context: { language, conversationHistory },
    });
    return response.data;
  } catch (error) {
    console.error('Chatbot Error:', error.message);
    throw new Error('Failed to get chatbot response');
  }
};

/**
 * Ask an AI question about a specific medicine
 */
export const askAboutMedicine = async (medicineName, question, medicineData = null, conversationId = null) => {
  try {
    const payload = {
      medicine_name: medicineName,
      question,
    };
    if (medicineData) payload.medicine_data = medicineData;
    if (conversationId) payload.conversation_id = conversationId;

    const response = await aiClient.post('/api/chatbot/medicine-ask', payload);
    return response.data;
  } catch (error) {
    console.error('Medicine Ask AI Error:', error.message);
    throw new Error('Failed to get AI answer about medicine');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Sathi (Women's Health) AI endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a daily symptom check-in and return personalised relief
 * recommendations + health insights from the Python AI service.
 *
 * @param {Object} payload  Fields forwarded from SathiSymptomLog + health context.
 */
export const analyseSathiSymptoms = async (payload) => {
  try {
    const response = await aiClient.post('/api/sathi/analyse', payload);
    return response.data;
  } catch (error) {
    console.error('Sathi Analyse Error:', error.message);
    throw new Error('Failed to analyse Sathi symptoms');
  }
};

/**
 * Fetch a personalised weekly pregnancy tip from the Python AI service.
 *
 * @param {Object} payload  { weeks_pregnant, trimester, known_conditions, user_name }
 */
export const getSathiPregnancyTip = async (payload) => {
  try {
    const response = await aiClient.post('/api/sathi/pregnancy-tip', payload);
    return response.data;
  } catch (error) {
    console.error('Sathi Pregnancy Tip Error:', error.message);
    throw new Error('Failed to get Sathi pregnancy tip');
  }
};

/**
 * Find generic alternatives for a list of medicines (bulk)
 */
export const findGenericAlternativesBulk = async (medicines) => {
  try {
    const response = await aiClient.post('/api/generic/find-bulk', { medicines });
    return response.data;
  } catch (error) {
    console.error('Generic Alternatives Bulk Error:', error.message);
    throw new Error('Failed to find generic alternatives');
  }
};

/**
 * Full voice pipeline: audio buffer → Whisper STT → Gemini → TTS
 *
 * @param {Buffer} audioBuffer
 * @param {string} mimeType     e.g. 'audio/webm', 'audio/wav'
 * @param {string|null} medicineName
 * @param {string|null} conversationId
 * @param {string} language     ISO-639-1 hint, or null for auto-detect
 * @param {string} mode         'two-way' (audio reply) | 'one-way' (text only)
 */
export const voiceAsk = async (
  audioBuffer,
  mimeType = 'audio/wav',
  medicineName = null,
  conversationId = null,
  language = null,
  mode = 'two-way',
) => {
  try {
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    form.append('audio', blob, 'recording.wav');
    if (medicineName) form.append('medicine_name', medicineName);
    if (conversationId) form.append('conversation_id', conversationId);
    if (language) form.append('language', language);
    form.append('mode', mode);

    const response = await aiClient.post('/api/voice/ask', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'arraybuffer',   // receive raw binary
      timeout: 120000,
    });

    const contentType = response.headers['content-type'] || '';

    if (contentType.startsWith('audio/')) {
      // Two-way: binary audio + metadata in X-Voice-Meta header
      const metaB64 = response.headers['x-voice-meta'];
      const meta = metaB64
        ? JSON.parse(Buffer.from(metaB64, 'base64').toString('utf8'))
        : {};
      return {
        ...meta,
        audioBuffer: Buffer.from(response.data),   // raw audio bytes
        audioMime: contentType.split(';')[0].trim(),
      };
    } else {
      // One-way: plain JSON
      const text = Buffer.from(response.data).toString('utf8');
      return JSON.parse(text);
    }
  } catch (error) {
    console.error('Voice Ask Error:', error.message);
    throw new Error('Failed to process voice message');
  }
};

/**
 * Text-to-Speech via Piper TTS (local, no internet after model download)
 *
 * @param {string} text       – text to synthesize
 * @param {string} language   – ISO-639-1 code e.g. 'en', 'hi'
 */
export const textToSpeech = async (text, language = 'en') => {
  try {
    const response = await aiClient.post(
      '/api/voice/speak',
      { text, language },
      { responseType: 'arraybuffer', timeout: 120000 },
    );
    const contentType = (response.headers['content-type'] || 'audio/wav').split(';')[0].trim();
    return {
      audioBuffer: Buffer.from(response.data),
      audioMime: contentType,
    };
  } catch (error) {
    console.error('TTS Error:', error.message);
    throw new Error('Failed to synthesize speech');
  }
};

/**
 * Extract medicines from prescription image for the chatbot flow.
 * Calls the Python /api/chatbot/prescription-extract endpoint.
 *
 * @param {string|null} imageUrl   - Cloudinary URL of the uploaded image
 * @param {Buffer|null} imageBuffer - Raw image buffer (alternative to URL)
 * @param {string}      mimeType   - e.g. 'image/jpeg'
 * @returns {Object} { doctor_info, patient_info, medicines, warnings, interaction_check, ... }
 */
export const extractPrescriptionForChat = async (imageUrl = null, imageBuffer = null, mimeType = 'image/jpeg') => {
  try {
    const payload = {};
    if (imageUrl) {
      payload.imageUrl = imageUrl;
      payload.mimeType = mimeType;
    } else if (imageBuffer) {
      payload.imageBase64 = imageBuffer.toString('base64');
      payload.mimeType = mimeType;
    } else {
      throw new Error('Either imageUrl or imageBuffer is required');
    }

    const response = await aiClient.post('/api/chatbot/prescription-extract', payload, {
      timeout: 60000,
    });
    return response.data;
  } catch (error) {
    console.error('Prescription chat extract error:', error.message);
    throw new Error('Failed to extract prescription data from image');
  }
};

/**
 * Ask a question about a prescription in the chatbot context.
 * Calls the Python /api/chatbot/prescription-ask endpoint.
 *
 * @param {string} question    - User's question
 * @param {Array}  medicines   - Validated medicines array from extractPrescriptionForChat
 * @param {string} sessionId   - Chat session ID for multi-turn history
 * @param {string} language    - 'en' | 'hi'
 * @returns {Object} { answer, suggestions, follow_up_questions, safety_warnings, interaction_alert, session_id }
 */
export const askAboutPrescription = async (question, medicines, sessionId, language = 'en') => {
  try {
    const response = await aiClient.post('/api/chatbot/prescription-ask', {
      question,
      medicines,
      session_id: sessionId,
      language,
    }, { timeout: 60000 });
    return response.data;
  } catch (error) {
    console.error('Prescription chat ask error:', error.message);
    throw new Error('Failed to answer prescription question');
  }
};

export default {
  processPrescriptionOCR,
  searchMedicines,
  getMedicineDetails,
  getMedicineAlternativesAI,
  getMedicineAlternatives,
  checkDrugInteractions,
  checkDuplicateMedicines,
  performSafetyCheck,
  chatWithAI,
  askAboutMedicine,
  voiceAsk,
  textToSpeech,
  extractPrescriptionForChat,
  askAboutPrescription,
};

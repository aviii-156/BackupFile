/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_CONFIG = {
  // Base URLs
  BASE_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  BASE_AI_URL: process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000',
  
  // API Endpoints
  API: {
    // Auth
    AUTH: {
      LOGIN: '/api/auth/login',
      SEND_OTP: '/api/auth/send-otp',
      VERIFY_OTP: '/api/auth/verify-otp',
      REGISTER_PATIENT: '/api/auth/register/patient',
      REGISTER_VENDOR: '/api/auth/register/vendor',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      VENDOR_STATUS: '/api/auth/vendor/check-status',
      ADMIN_LOGIN: '/api/auth/admin/login',
      ADMIN_2FA: '/api/auth/admin/verify-2fa',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
    },

    // Vendor self-service
    VENDOR: {
      PROFILE: '/api/vendor/profile',
      DASHBOARD: '/api/vendor/dashboard',
      INVENTORY: '/api/vendor/inventory',
      INVENTORY_STATS: '/api/vendor/inventory/stats',
      INVENTORY_ITEM: (id: string) => `/api/vendor/inventory/${id}`,
      CATALOG_SEARCH: '/api/catalog/search',
      CATALOG_ADD: (productId: string | number) => `/api/catalog/${productId}/add-to-inventory`,
      ORDERS: '/api/vendor/orders',
      ORDER_STATS: '/api/vendor/orders/stats',
      ORDER_STATUS: (id: string) => `/api/vendor/orders/${id}/status`,
      ANALYTICS: '/api/vendor/analytics',
    },
    
    // Patient
    PATIENT: {
      DASHBOARD: '/api/patient/dashboard',
      PROFILE: '/api/patient/profile',
      ADDRESSES: '/api/patient/addresses',
      SAVINGS: '/api/patient/savings-summary',
      EMERGENCY_CONTACTS: '/api/patient/emergency-contacts',
      MEDICAL_INFO: '/api/patient/medical-info',
      CHANGE_PASSWORD: '/api/patient/change-password',
    },
    
    // Medicine
    MEDICINE: {
      SEARCH: '/api/medicine/search',
      BROWSE: '/api/medicine/browse',
      GET_BY_ID: (id: string) => `/api/medicine/${id}`,
      ALTERNATIVES: (id: string) => `/api/medicine/${id}/alternatives`,
      GENERIC_ALTERNATIVES: '/api/medicine/generic-alternatives',
    },
    
    // Store/Vendor
    STORE: {
      NEARBY: '/api/store/nearby',
      GET_BY_ID: (id: string) => `/api/store/${id}`,
      INVENTORY: (id: string) => `/api/store/${id}/inventory`,
      COMPARE: '/api/store/compare',
      SEARCH_BY_MEDICINES: '/api/store/search-by-medicines',
    },
    
    // Prescription
    PRESCRIPTION: {
      SCAN: '/api/prescription/scan',
      UPLOAD: '/api/prescription/upload',
      HISTORY: '/api/prescription/history',
      GET_BY_ID: (id: string) => `/api/prescription/${id}`,
      DELETE: (id: string) => `/api/prescription/${id}`,
    },
    
    // Order
    ORDER: {
      CREATE: '/api/order/create',
      HISTORY: '/api/order/history',
      GET_BY_ID: (id: string) => `/api/order/${id}`,
      TRACK: (id: string) => `/api/order/${id}/track`,
      CANCEL: (id: string) => `/api/order/${id}/cancel`,
      RATE: (id: string) => `/api/order/${id}/rate`,
      PAYMENT_INTENT: '/api/order/payment/create-intent',
      PAYMENT_CONFIRM: '/api/order/payment/confirm',
    },
    
    // Emergency
    EMERGENCY: {
      TRIGGER: '/api/emergency/trigger',
      AMBULANCE: '/api/emergency/ambulance',
      FAMILY: '/api/emergency/family',
      STATUS: (id: string) => `/api/emergency/${id}/status`,
      RESOLVE: (id: string) => `/api/emergency/${id}/resolve`,
      RESPOND: (id: string) => `/api/emergency/${id}/respond`,
    },
    
    // Chatbot
    CHATBOT: {
      MESSAGE: '/api/chatbot/message',
      VOICE: '/api/chatbot/voice',
      SESSIONS: '/api/chatbot/sessions',
      HISTORY: (id: string) => `/api/chatbot/${id}/history`,
      DELETE: (id: string) => `/api/chatbot/${id}`,
      PRESCRIPTION_UPLOAD: '/api/chatbot/prescription',
      PRESCRIPTION_ASK: '/api/chatbot/prescription-ask',
    },

    // Sathi — Women's Health
    SATHI: {
      PROFILE:           '/api/sathi/profile',
      PROFILE_SETUP:     '/api/sathi/profile/setup',
      CYCLE:             '/api/sathi/cycle',
      LOG_PERIOD:        '/api/sathi/cycle/log-period',
      SYMPTOMS:          '/api/sathi/symptoms',
      RELIEF:            '/api/sathi/relief',
      INSIGHTS:          '/api/sathi/insights',
      INSIGHTS_READ:     '/api/sathi/insights/read',
      PREGNANCY_TOGGLE:  '/api/sathi/pregnancy/toggle',
      PREGNANCY:         '/api/sathi/pregnancy',
      PREGNANCY_TIP:     '/api/sathi/pregnancy/tip',
      REMINDERS:         '/api/sathi/reminders',
      REMINDER:          (id: string) => `/api/sathi/reminders/${id}`,
      REMINDER_COMPLETE: (id: string) => `/api/sathi/reminders/${id}/complete`,
    },

    // Medicine Reminders
    REMINDERS: {
      LIST:        '/api/reminders',
      STATS:       '/api/reminders/stats',
      CREATE:      '/api/reminders',
      GET:         (id: string) => `/api/reminders/${id}`,
      UPDATE:      (id: string) => `/api/reminders/${id}`,
      DELETE:      (id: string) => `/api/reminders/${id}`,
      MARK_TAKEN:  (id: string) => `/api/reminders/${id}/mark-taken`,
      MARK_MISSED: (id: string) => `/api/reminders/${id}/mark-missed`,
    },

    // In-app Notifications
    NOTIFICATIONS: {
      LIST:          '/api/notifications',
      UNREAD_COUNT:  '/api/notifications/unread-count',
      MARK_READ:     (id: string) => `/api/notifications/${id}/read`,
      MARK_ALL_READ: '/api/notifications/read-all',
    },
  },
  
  // AI Endpoints
  AI: {
    // OCR
    OCR: {
      UPLOAD: '/api/ocr/upload',
      EXTRACT_MEDICINES: '/api/ocr/extract-medicines',
      PARSE_PRESCRIPTION: '/api/ocr/parse-prescription',
    },
    
    // Medicine AI
    MEDICINE: {
      SEARCH: '/api/medicines/search',
      GET_BY_NAME: (name: string) => `/api/medicines/search/${name}`,
      ALTERNATIVES: '/api/medicines/find-alternatives',
      SAVINGS: '/api/medicines/calculate-savings',
    },
    
    // Interactions
    INTERACTION: {
      CHECK_DRUGS: '/api/interactions/check-drugs',
      CHECK_SPECIFIC: (med1: string, med2: string) => `/api/interactions/check-drugs/${med1}/${med2}`,
      CHECK_DUPLICATES: '/api/interactions/check-duplicates',
      COMPREHENSIVE: '/api/interactions/comprehensive-check',
    },
    
    // Chatbot AI
    CHATBOT: {
      ASK: '/api/chatbot/ask',
      MEDICINE_INFO: '/api/chatbot/medicine-info',
      MEDICINE_ASK: '/api/chatbot/medicine-ask',
      SYMPTOM_CHECK: '/api/chatbot/symptom-check',
      EXPLAIN_PRESCRIPTION: '/api/chatbot/explain-prescription',
    },
    
    // AI Analysis
    AI: {
      ANALYZE: '/api/ai/analyze',
      VALIDATE: '/api/ai/validate',
      SUGGEST_ALTERNATIVES: '/api/ai/suggest-alternatives',
      SAFETY_CHECK: '/api/ai/safety-check',
    },
  },
};

export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TEMP_TOKEN: 'tempToken',
  USER_DATA: 'userData',
  USER_ROLE: 'userRole',
};

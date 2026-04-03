/**
 * TypeScript Types from Backend Models
 * Based on quickmedi-api MongoDB schemas
 */

// ==================== Common Types ====================
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

// ==================== User/Patient Types ====================
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  profilePhoto?: string;
  role: 'patient';
  isActive: boolean;
  language: 'en' | 'hi';
  subscription: 'free' | 'pro';
  subscriptionExpiry?: Date;
  savedAddresses: Address[];
  emergencyContacts: EmergencyContact[];
  medicalInfo?: MedicalInfo;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  _id?: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isDefault: boolean;
}

export interface EmergencyContact {
  _id?: string;
  name: string;
  phone: string;
  relation: string;
}

export interface MedicalInfo {
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  height?: number;
  weight?: number;
}

export interface UserPreferences {
  reminderTime?: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

// ==================== Vendor Types ====================
export interface Vendor {
  _id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  storePhoto?: string;
  role: 'vendor';
  licenseNumber: string;
  gstNumber?: string;
  licenseDocument: string;
  gstDocument?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  isActive: boolean;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  operatingHours: {
    open: string;
    close: string;
    is24x7: boolean;
  };
  servicesOffered: string[];
  deliveryRadius: number;
  rating: {
    average: number;
    count: number;
  };
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Medicine Types ====================
export interface Medicine {
  _id: string;
  name: string;
  brandName?: string;
  genericName: string;
  composition: string;
  activeIngredients: Array<{
    name: string;
    strength: string;
    unit: string;
  }>;
  strength?: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler' | 'powder' | 'other';
  category: 'antibiotic' | 'analgesic' | 'antidiabetic' | 'antihypertensive' | 'antifungal' | 'antiviral' | 'vitamin' | 'antacid' | 'antiallergic' | 'other';
  therapeuticClass?: string;
  usedFor: string[];
  sideEffects: string[];
  contraindications: string[];
  foodInteractions: string[];
  howToTake?: string;
  dosageInstructions?: string;
  requiresPrescription: boolean;
  scheduleClass?: 'H' | 'H1' | 'G' | 'X' | 'OTC';
  mrp?: number;
  averageMarketPrice?: number;
  source: 'openfda' | 'manual' | 'vendor_added';
  isVerified: boolean;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  alternatives: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Order Types ====================
export interface Order {
  _id: string;
  patientId: string;
  vendorId: string;
  prescriptionId?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  savedAmount: number;
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    note?: string;
  }>;
  cancelReason?: string;
  rejectReason?: string;
  paymentMethod: 'stripe_card' | 'stripe_upi' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  paidAt?: Date;
  deliveryAddress: Address;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  isEmergencyOrder: boolean;
  rating?: {
    stars: number;
    review?: string;
    ratedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  inventoryId?: string;
  medicineId?: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  mrp: number;
  discount: number;
}

// ==================== Prescription Types ====================
export interface Prescription {
  _id: string;
  patientId: string;
  imageUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  ocrData?: {
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
  };
  aiAnalysis?: {
    recommendations: string[];
    warnings: string[];
    interactions: string[];
  };
  usedInOrder?: string;
  isExpired: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Emergency Types ====================
export interface Emergency {
  _id: string;
  patientId: string;
  type: 'pharmacy_alert' | 'ambulance' | 'family_alert';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  note?: string;
  status: 'active' | 'responded' | 'resolved' | 'cancelled';
  responses: Array<{
    vendorId?: string;
    message: string;
    respondedAt: Date;
  }>;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Chatbot Types ====================
export interface ChatSession {
  _id: string;
  patientId: string;
  messages: ChatMessage[];
  context?: {
    currentMedications?: string[];
    recentSymptoms?: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
  };
}

// ==================== Admin Types ====================
export interface Admin {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  twoFactorEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Inventory Types ====================
export interface VendorInventory {
  _id: string;
  vendorId: string;
  medicineId: string;
  stock: number;
  minStockLevel: number;
  price: number;
  mrp: number;
  discount: number;
  isAvailable: boolean;
  expiryDate?: Date;
  batchNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Stats Types ====================
export interface PlatformStats {
  _id: string;
  date: Date;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalVendors: number;
    activeVendors: number;
    pendingVendors: number;
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    emergencyRequests: number;
    chatbotQueries: number;
  };
  createdAt: Date;
}

// ==================== Request/Response Types ====================
export interface LoginRequest {
  email: string;
  password?: string;
  otp?: string;
}

export interface RegisterPatientRequest {
  email: string;
  name: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: Address;
  bloodGroup?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface RegisterVendorRequest {
  email: string;
  storeName: string;
  ownerName: string;
  phone: string;
  licenseNumber: string;
  gstNumber?: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: {
    coordinates: [number, number];
  };
}

export interface CreateOrderRequest {
  vendorId: string;
  prescriptionId?: string;
  items: Array<{
    medicineId: string;
    medicineName: string;
    quantity: number;
  }>;
  deliveryAddressId: string;
  paymentMethod: 'stripe_card' | 'stripe_upi' | 'cod';
  isEmergencyOrder?: boolean;
}

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
}

export interface TriggerEmergencyRequest {
  latitude: number;
  longitude: number;
  type: 'pharmacy_alert' | 'ambulance' | 'family_alert';
  note?: string;
}

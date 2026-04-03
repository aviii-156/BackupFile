import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';
import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import Reminder from '../models/Reminder.js';
import PlatformStats from '../models/PlatformStats.js';
import { findNearbyVendors } from '../services/location.service.js';
import { calculateDeliveryTime } from '../utils/calculateDeliveryTime.js';

/**
 * @route   GET /api/patient/dashboard
 * @desc    Get patient dashboard data
 * @access  Private (Patient)
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  // Get today's reminders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch reminders, prescription count, order count in parallel
  const [todayReminders, totalPrescriptions, totalOrders, recentOrders] = await Promise.all([
    Reminder.find({
      userId,
      isActive: true,
      startDate: { $lte: tomorrow },
      $or: [
        { endDate: { $gte: today } },
        { endDate: null },
      ],
    }).limit(10),
    Prescription.countDocuments({ userId }),
    Order.countDocuments({ patientId: userId }),
    Order.find({ patientId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id status items totalAmount createdAt'),
  ]);

  // Get nearby pharmacies (up to 3) from user's default address
  let nearbyPharmacies = [];
  if (user.savedAddresses && user.savedAddresses.length > 0) {
    const defaultAddress = user.savedAddresses.find(addr => addr.isDefault) || user.savedAddresses[0];
    if (defaultAddress && defaultAddress.location) {
      const [lng, lat] = defaultAddress.location.coordinates;
      const nearby = await findNearbyVendors(lat, lng, 10, 3);
      nearbyPharmacies = nearby.map(v => ({
        id: v._id.toString(),
        name: v.storeName,
        distance: `${v.distance} km`,
        rating: v.rating || 4.0,
        open: v.isOpenNow,
        deliveryTime: v.deliveryTime || '20-30 min',
      }));
    }
  }

  return apiResponse(res, 200, 'Dashboard data retrieved', {
    user: {
      name: user.name,
      subscription: user.subscription,
      totalSaved: user.totalSaved,
      bloodGroup: user.medicalInfo?.bloodGroup || '',
      dateOfBirth: user.dateOfBirth || null,
      allergies: user.medicalInfo?.allergies || [],
      chronicConditions: user.medicalInfo?.chronicConditions || [],
    },
    stats: {
      prescriptions: totalPrescriptions,
      activeReminders: todayReminders.length,
      savedAmount: user.totalSaved || 0,
      totalOrders,
    },
    recentOrders,
    upcomingReminders: todayReminders,
    nearbyPharmacies,
  });
});

/**
 * @route   GET /api/patient/profile
 * @desc    Get patient profile
 * @access  Private (Patient)
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('-refreshToken -lastLogoutAt');

  return apiResponse(res, 200, 'Profile retrieved', { user });
});

/**
 * @route   PUT /api/patient/profile
 * @desc    Update patient profile (name, email, phone, dateOfBirth, gender, photo)
 * @access  Private (Patient)
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, dateOfBirth, gender, profilePhoto } = req.body;

  const user = await User.findById(req.userId);

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
  if (gender) user.gender = gender;
  if (profilePhoto) user.profilePhoto = profilePhoto;

  // Handle uploaded image
  if (req.uploadedImageUrl) {
    user.profilePhoto = req.uploadedImageUrl;
  }

  await user.save();

  return apiResponse(res, 200, 'Profile updated successfully', { user });
});

/**
 * @route PUT /api/patient/language
 * @desc Update language preference
 * @access Private (Patient)
 */
export const updateLanguage = asyncHandler(async (req, res) => {
  const { language } = req.body;

  const user = await User.findById(req.userId);
  user.language = language;
  await user.save();

  return apiResponse(res, 200, 'Language updated', { language });
});

/**
 * @route   PUT /api/patient/change-password
 * @desc    Change patient password
 * @access  Private (Patient)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  // If user has no password yet (OTP-only account), allow setting one directly
  if (user.password) {
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return apiResponse(res, 200, 'Password changed successfully', null);
});

/**
 * @route   PUT /api/patient/emergency-contacts
 * @desc    Update emergency contacts
 * @access  Private (Patient)
 */
export const updateEmergencyContacts = asyncHandler(async (req, res) => {
  const { emergencyContacts } = req.body;

  const user = await User.findById(req.userId);
  user.emergencyContacts = emergencyContacts;
  await user.save();

  return apiResponse(res, 200, 'Emergency contacts updated', { emergencyContacts });
});

/**
 * @route   PUT /api/patient/medical-info
 * @desc    Update medical information
 * @access  Private (Patient)
 */
export const updateMedicalInfo = asyncHandler(async (req, res) => {
  const { bloodGroup, allergies, chronicConditions, currentMedications } = req.body;

  const user = await User.findById(req.userId);
  
  if (bloodGroup) user.medicalInfo.bloodGroup = bloodGroup;
  if (allergies !== undefined) user.medicalInfo.allergies = allergies;
  if (chronicConditions !== undefined) user.medicalInfo.chronicConditions = chronicConditions;
  if (currentMedications !== undefined) user.medicalInfo.currentMedicines = currentMedications;
  
  await user.save();

  return apiResponse(res, 200, 'Medical information updated', { medicalInfo: user.medicalInfo });
});

/**
 * @route   POST /api/patient/addresses
 * @desc    Add new saved address (coordinates from device location)
 * @access  Private (Patient)
 */
export const addSavedAddress = asyncHandler(async (req, res) => {
  const { addressLine1, addressLine2, street, city, state, pincode, country, latitude, longitude, label, isDefault } = req.body;

  const user = await User.findById(req.userId);

  // If this is set as default, unset other defaults
  if (isDefault) {
    user.savedAddresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // If this is the first address, make it default
  const makeDefault = isDefault || user.savedAddresses.length === 0;

  // Create address object with GeoJSON location
  const newAddress = {
    addressLine1,
    addressLine2: addressLine2 || '',
    street: street || '',
    city,
    state,
    pincode,
    country: country || 'India',
    location: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
    },
    label: label || 'home',
    isDefault: makeDefault,
  };

  user.savedAddresses.push(newAddress);
  await user.save();

  return apiResponse(res, 201, 'Address added successfully', { 
    address: user.savedAddresses[user.savedAddresses.length - 1] 
  });
});

/**
 * @route   PUT /api/patient/addresses/:addressId
 * @desc    Update specific saved address
 * @access  Private (Patient)
 */
export const updateSavedAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { addressLine1, addressLine2, street, city, state, pincode, country, latitude, longitude, label, isDefault } = req.body;

  const user = await User.findById(req.userId);
  const address = user.savedAddresses.id(addressId);

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // If setting as default, unset other defaults
  if (isDefault) {
    user.savedAddresses.forEach(addr => {
      if (addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
  }

  // Update fields
  if (addressLine1) address.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
  if (street !== undefined) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (pincode) address.pincode = pincode;
  if (country) address.country = country;
  if (label) address.label = label;
  if (isDefault !== undefined) address.isDefault = isDefault;

  // Update coordinates if both latitude and longitude are provided
  if (latitude !== undefined && longitude !== undefined) {
    address.location = {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
    };
  }

  await user.save();

  return apiResponse(res, 200, 'Address updated successfully', { address });
});

/**
 * @route   DELETE /api/patient/addresses/:addressId
 * @desc    Delete saved address
 * @access  Private (Patient)
 */
export const deleteSavedAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);
  const address = user.savedAddresses.id(addressId);

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  const wasDefault = address.isDefault;
  address.deleteOne();

  // If deleted address was default, make first remaining address default
  if (wasDefault && user.savedAddresses.length > 0) {
    user.savedAddresses[0].isDefault = true;
  }

  await user.save();

  return apiResponse(res, 200, 'Address deleted successfully');
});

/**
 * @route   PUT /api/patient/addresses/:addressId/default
 * @desc    Set address as default
 * @access  Private (Patient)
 */
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);
  const address = user.savedAddresses.id(addressId);

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Unset all defaults
  user.savedAddresses.forEach(addr => {
    addr.isDefault = false;
  });

  // Set this as default
  address.isDefault = true;

  await user.save();

  return apiResponse(res, 200, 'Default address updated', { address });
});

/**
 * @route   GET /api/patient/addresses
 * @desc    Get all saved addresses
 * @access  Private (Patient)
 */
export const getSavedAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('savedAddresses');

  return apiResponse(res, 200, 'Addresses retrieved', { addresses: user.savedAddresses });
});

/**
 * @route   POST /api/patient/fcm-token
 * @desc    Register FCM token
 * @access  Private (Patient)
 */
export const registerFCMToken = asyncHandler(async (req, res) => {
  const { token, device } = req.body;

  const user = await User.findById(req.userId);

  // Remove existing token if present
  user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);

  // Add new token
  user.fcmTokens.push({
    token,
    device: device || 'unknown',
    updatedAt: new Date(),
  });

  // Keep only last 5 tokens
  if (user.fcmTokens.length > 5) {
    user.fcmTokens = user.fcmTokens.slice(-5);
  }

  await user.save();

  return apiResponse(res, 200, 'FCM token registered', null);
});

/**
 * @route   GET /api/patient/savings-summary
 * @desc    Get savings summary
 * @access  Private (Patient)
 */
export const getSavingsSummary = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const prescriptions = await Prescription.find({
    userId,
    status: 'complete',
  });

  const totalSaved = prescriptions.reduce((sum, p) => sum + (p.costs?.saved || 0), 0);
  const totalPrescriptions = prescriptions.length;
  const avgSavingsPerPrescription = totalPrescriptions > 0 ? totalSaved / totalPrescriptions : 0;

  // Monthly breakdown
  const monthlySavings = {};
  prescriptions.forEach(p => {
    const month = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlySavings[month]) {
      monthlySavings[month] = 0;
    }
    monthlySavings[month] += p.costs?.saved || 0;
  });

  return apiResponse(res, 200, 'Savings summary retrieved', {
    totalSaved,
    totalPrescriptions,
    avgSavingsPerPrescription: parseFloat(avgSavingsPerPrescription.toFixed(2)),
    monthlySavings,
  });
});

export default {
  getDashboard,
  getProfile,
  updateProfile,
  updateLanguage,
  changePassword,
  updateEmergencyContacts,
  updateMedicalInfo,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultAddress,
  getSavedAddresses,
  registerFCMToken,
  getSavingsSummary,
};

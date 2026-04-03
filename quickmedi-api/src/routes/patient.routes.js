import express from 'express';
import {
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
} from '../controllers/patient.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { upload, uploadImage } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import {
  updateProfileSchema,
  savedAddressSchema,
  updateAddressSchema,
  updateEmergencyContactsSchema,
  updateMedicalInfoSchema,
  updateLanguageSchema,
  registerFCMTokenSchema,
  changePasswordSchema,
} from '../validators/patient.validator.js';

const router = express.Router();

// All routes require patient authentication
router.use(authenticate);
router.use(requireRole('patient'));
router.use(authRateLimit);

// Dashboard & Profile
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put(
  '/profile',
  upload.single('profilePhoto'),
  uploadImage('profiles'),
  validate(updateProfileSchema),
  updateProfile
);

// Preferences
router.put('/language', validate(updateLanguageSchema), updateLanguage);

// Change Password
router.put('/change-password', validate(changePasswordSchema), changePassword);

// Emergency Contacts
router.put('/emergency-contacts', validate(updateEmergencyContactsSchema), updateEmergencyContacts);

// Medical Information
router.put('/medical-info', validate(updateMedicalInfoSchema), updateMedicalInfo);

// Address Management (device location support)
router.get('/addresses', getSavedAddresses);
router.post('/addresses', validate(savedAddressSchema), addSavedAddress);
router.put('/addresses/:addressId', validate(updateAddressSchema), updateSavedAddress);
router.delete('/addresses/:addressId', deleteSavedAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

// FCM Token
router.post('/fcm-token', validate(registerFCMTokenSchema), registerFCMToken);

// Savings Summary
router.get('/savings-summary', getSavingsSummary);

export default router;

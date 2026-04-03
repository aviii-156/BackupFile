import express from 'express';
import {
  sendOTP,
  verifyOTP,
  registerPatient,
  registerVendor,
  checkVendorStatus,
  refreshAccessToken,
  logout,
  loginUser,
  adminLogin,
  verifyTwoFactor,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { tempAuth } from '../middleware/tempAuth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload, uploadImages } from '../middleware/upload.middleware.js';
import { otpRateLimit, publicRateLimit } from '../middleware/rateLimit.middleware.js';
import {
  sendOTPSchema,
  verifyOTPSchema,
  registerPatientSchema,
  registerVendorSchema,
  checkVendorStatusSchema,
  refreshTokenSchema,
  loginSchema,
  adminLoginSchema,
  verify2FASchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

// OTP routes
router.post('/send-otp', otpRateLimit, validate(sendOTPSchema), sendOTP);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);

// Password login route
router.post('/login', publicRateLimit, validate(loginSchema), loginUser);

// Registration routes
router.post(
  '/register/patient',
  tempAuth,
  validate(registerPatientSchema),
  registerPatient
);

router.post(
  '/register/vendor',
  tempAuth,
  upload.array('documents', 3),
  uploadImages('vendor-documents'),
  validate(registerVendorSchema),
  registerVendor
);

// Vendor status check
router.post(
  '/vendor/check-status',
  publicRateLimit,
  validate(checkVendorStatusSchema),
  checkVendorStatus
);

// Token management
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);
router.post('/logout', logout); // No auth required — always succeeds so clients can always log out

// Admin routes
router.post('/admin/login', publicRateLimit, validate(adminLoginSchema), adminLogin);
router.post('/admin/verify-2fa', validate(verify2FASchema), verifyTwoFactor);

// Password reset
router.post('/forgot-password', publicRateLimit, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', publicRateLimit, validate(resetPasswordSchema), resetPassword);

export default router;

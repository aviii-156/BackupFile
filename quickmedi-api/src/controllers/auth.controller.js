import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { generateOTP } from '../utils/generateOTP.js';
import { generateTokens, generateTempToken } from '../utils/generateTokens.js';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';
import { sendOTPEmail, sendWelcomeEmail, sendVendorRegistrationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { sendNewVendorNotificationToAdmin } from '../services/notification.service.js';
import { getIO } from '../config/socket.js';
import { config } from '../config/env.js';

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email address
 * @access  Public
 */
export const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  // Check if OTP already exists and not expired
  const existingOTP = await OTP.findOne({
    email: email.toLowerCase(),
    expiresAt: { $gt: new Date() },
  });

  if (existingOTP) {
    const remainingTime = Math.ceil((existingOTP.expiresAt - new Date()) / 1000);
    throw new ApiError(429, `OTP already sent. Please wait ${remainingTime} seconds or request a new OTP.`, 'OTP_ALREADY_SENT');
  }

  // Delete any existing OTP for this email
  await OTP.deleteMany({ email: email.toLowerCase() });

  // Generate OTP
  const otp = generateOTP();

  // Hash OTP
  const hashedOTP = await bcrypt.hash(otp, 10);

  // Create OTP document
  await OTP.create({
    email: email.toLowerCase(),
    otp: hashedOTP,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  // Send Email
  try {
    await sendOTPEmail(email, otp);
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw new ApiError(500, 'Failed to send OTP email. Please try again.');
  }

  return apiResponse(res, 200, 'OTP sent successfully to your email', {
    expiresIn: 600, // seconds (10 minutes)
  });
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and return token
 * @access  Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  // Find OTP document
  const otpDoc = await OTP.findOne({ email: email.toLowerCase() });

  if (!otpDoc) {
    throw new ApiError(400, 'OTP expired or not sent', 'OTP_NOT_FOUND');
  }

  // Check if already used
  if (otpDoc.isUsed) {
    throw new ApiError(400, 'OTP already used', 'OTP_ALREADY_USED');
  }

  // Check expiry
  if (otpDoc.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpDoc._id });
    throw new ApiError(400, 'OTP expired. Please request a new one.', 'OTP_EXPIRED');
  }

  // Increment attempts
  otpDoc.attempts += 1;

  // Check max attempts
  if (otpDoc.attempts > 5) {
    await OTP.deleteOne({ _id: otpDoc._id });
    throw new ApiError(400, 'Too many failed attempts. Please request a new OTP.', 'TOO_MANY_ATTEMPTS');
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, otpDoc.otp);

  if (!isValid) {
    await otpDoc.save();
    const remainingAttempts = 5 - otpDoc.attempts;
    throw new ApiError(400, `Wrong OTP. ${remainingAttempts} attempts remaining.`, 'WRONG_OTP');
  }

  // OTP is correct - delete it immediately
  await OTP.deleteOne({ _id: otpDoc._id });

  // Check if user exists
  let user = await User.findOne({ email: email.toLowerCase() });
  let vendor = await Vendor.findOne({ email: email.toLowerCase() });

  // Returning user
  if (user) {
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    return apiResponse(res, 200, 'Login successful', {
      isNewUser: false,
      userType: 'patient',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        subscription: user.subscription,
        language: user.language,
      },
    });
  }

  // Returning vendor
  if (vendor) {
    // Check approval status
    if (vendor.approvalStatus === 'pending') {
      return apiResponse(res, 200, 'Account under review', {
        isNewUser: false,
        userType: 'vendor',
        approvalStatus: 'pending',
        message: 'Your vendor account is pending admin approval.',
      });
    }

    if (vendor.approvalStatus === 'rejected') {
      return apiResponse(res, 403, 'Account rejected', {
        isNewUser: false,
        userType: 'vendor',
        approvalStatus: 'rejected',
        reason: vendor.approvalNote || 'N/A',
      });
    }

    // Approved vendor
    const { accessToken, refreshToken } = generateTokens(vendor._id.toString(), vendor.role);
    
    vendor.refreshToken = refreshToken;
    await vendor.save();

    return apiResponse(res, 200, 'Login successful', {
      isNewUser: false,
      userType: 'vendor',
      accessToken,
      refreshToken,
      vendor: {
        id: vendor._id,
        storeName: vendor.storeName,
        email: vendor.email,
        phone: vendor.phone,
        approvalStatus: vendor.approvalStatus,
        isOpenNow: vendor.isOpenNow,
      },
    });
  }

  // New user - generate temp token with email
  const tempToken = generateTempToken(email.toLowerCase());

  return apiResponse(res, 200, 'OTP verified. Please complete registration.', {
    isNewUser: true,
    tempToken,
  });
});

/**
 * @route   POST /api/auth/register/patient
 * @desc    Register new patient
 * @access  Protected (temp token)
 */
export const registerPatient = asyncHandler(async (req, res) => {
  const { 
    fullName, 
    name, 
    phone, 
    language, 
    dateOfBirth, 
    gender, 
    address, 
    bloodGroup, 
    emergencyContacts,
    allergies,
    chronicConditions,
    currentMedications,
    password,
  } = req.body;
  const email = req.tempEmail;

  // Accept either fullName or name
  const userName = fullName || name;
  
  if (!userName) {
    throw new ApiError(400, 'Name is required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'User already exists', 'USER_EXISTS');
  }

  // Prepare user data
  const userData = {
    name: userName,
    email: email.toLowerCase(),
    phone: phone || undefined,
    language: language || 'en',
    dateOfBirth: dateOfBirth || undefined,
    gender: gender || undefined,
    password: password || undefined,
  };

  // Handle address if provided
  if (address) {
    const { street, city, state, pincode, country, latitude, longitude } = address;
    
    if (latitude && longitude) {
      userData.savedAddresses = [{
        label: 'Home',
        addressLine1: street || address.addressLine1,
        addressLine2: address.addressLine2,
        city: city,
        state: state,
        pincode: pincode,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        isDefault: true
      }];
    }
  }

  // Handle medical info
  if (bloodGroup || allergies || chronicConditions || currentMedications) {
    userData.medicalInfo = {
      bloodGroup: bloodGroup || undefined,
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      currentMedicines: currentMedications || []
    };
  }

  // Handle emergency contacts
  if (emergencyContacts && Array.isArray(emergencyContacts)) {
    userData.emergencyContacts = emergencyContacts;
  }

  // Create user
  const user = await User.create(userData);

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);
  
  user.refreshToken = refreshToken;
  await user.save();

  // Send welcome email
  try {
    await sendWelcomeEmail(user.email, user.name);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  // Socket emit welcome
  try {
    const io = getIO();
    io.to(`user:${user._id}`).emit('welcome', {
      message: 'Welcome to QuickMedi!',
      userName: user.name,
    });
  } catch (error) {
    console.error('Socket error:', error);
  }

  return apiResponse(res, 201, 'Registration successful', {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      subscription: user.subscription,
      language: user.language,
      savedAddresses: user.savedAddresses,
      emergencyContacts: user.emergencyContacts,
      medicalInfo: user.medicalInfo,
    },
  });
});

/**
 * @route   POST /api/auth/register/vendor
 * @desc    Register new vendor
 * @access  Protected (temp token)
 */
export const registerVendor = asyncHandler(async (req, res) => {
  const email = req.tempEmail;
  
  const {
    storeName,
    ownerName,
    phone,
    password,
    licenseNumber,
    gstNumber,
    address,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    latitude,
    longitude,
    deliveryRadius,
    deliveryAvailable,
    operatingHours,
  } = req.body;

  // Handle nested address format (from form-data with address[field])
  let vendorAddress = {};
  let vendorLat, vendorLng;

  if (address && typeof address === 'object') {
    // Nested format
    vendorAddress = {
      addressLine1: address.addressLine1 || address.street || '',
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country || 'India',
    };
    vendorLat = address.latitude;
    vendorLng = address.longitude;
  } else {
    // Flat format (backward compatibility)
    vendorAddress = {
      addressLine1: addressLine1 || '',
      addressLine2: addressLine2 || '',
      city: city,
      state: state,
      pincode: pincode,
      country: 'India',
    };
    vendorLat = latitude;
    vendorLng = longitude;
  }

  // Validation
  if (!storeName || !ownerName || !licenseNumber) {
    throw new ApiError(400, 'Store name, owner name, and license number are required');
  }

  if (!password || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  if (!vendorAddress.city || !vendorAddress.state || !vendorAddress.pincode) {
    throw new ApiError(400, 'Address (city, state, pincode) is required');
  }

  if (!vendorLat || !vendorLng) {
    throw new ApiError(400, 'Location coordinates (latitude, longitude) are required');
  }

  // Check if vendor already exists
  const existingVendor = await Vendor.findOne({ email: email.toLowerCase() });
  if (existingVendor) {
    throw new ApiError(400, 'Vendor already exists', 'VENDOR_EXISTS');
  }

  // Check license uniqueness
  const existingLicense = await Vendor.findOne({ licenseNumber });
  if (existingLicense) {
    throw new ApiError(400, 'License number already registered', 'LICENSE_EXISTS');
  }

  // File uploads should be handled by upload middleware
  const licenseDocument = req.uploadedImageUrls?.[0];
  const gstDocument = req.uploadedImageUrls?.[1];

  if (!licenseDocument) {
    throw new ApiError(400, 'License document is required');
  }

  // Parse operating hours if it's a string
  let parsedOperatingHours = operatingHours;
  if (typeof operatingHours === 'string') {
    try {
      parsedOperatingHours = JSON.parse(operatingHours);
    } catch (error) {
      throw new ApiError(400, 'Invalid operating hours format');
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create vendor
  const vendor = await Vendor.create({
    storeName,
    ownerName,
    email: email.toLowerCase(),
    phone: phone || undefined,
    password: hashedPassword,
    licenseNumber,
    gstNumber,
    licenseDocument,
    gstDocument,
    address: vendorAddress,
    location: {
      type: 'Point',
      coordinates: [parseFloat(vendorLng), parseFloat(vendorLat)],
    },
    deliveryRadius: deliveryRadius || 5,
    deliveryAvailable: deliveryAvailable !== false,
    operatingHours: parsedOperatingHours || {},
    approvalStatus: 'pending',
  });

  // Send email notification
  try {
    await sendVendorRegistrationEmail(vendor.email, vendor.storeName);
  } catch (error) {
    console.error('Email error:', error);
  }

  // Notify admin via socket
  try {
    const io = getIO();
    io.to('admin').emit('admin:new_vendor', {
      vendorId: vendor._id,
      storeName: vendor.storeName,
      ownerName: vendor.ownerName,
      email: vendor.email,
      phone: vendor.phone,
      city: vendor.address.city,
      submittedAt: vendor.createdAt,
    });

    // Get admin FCM tokens
    const admins = await Admin.find({ isActive: true });
    const adminTokens = admins.flatMap(admin => 
      admin.fcmTokens && admin.fcmTokens.length > 0 ? admin.fcmTokens.map(t => t.token) : []
    );

    if (adminTokens.length > 0) {
      await sendNewVendorNotificationToAdmin(adminTokens, storeName, city);
    }
  } catch (error) {
    console.error('Notification error:', error);
  }

  return apiResponse(res, 201, 'Vendor registration submitted for approval', {
    vendorId: vendor._id,
    status: 'pending',
    message: 'Your application is under review. You will be notified via email once approved.',
  });
});

/**
 * @route   POST /api/auth/vendor/check-status
 * @desc    Check vendor approval status
 * @access  Public
 */
export const checkVendorStatus = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const vendor = await Vendor.findOne({ email: email.toLowerCase() }).select('approvalStatus approvalNote storeName');

  if (!vendor) {
    throw new ApiError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
  }

  return apiResponse(res, 200, 'Status retrieved', {
    status: vendor.approvalStatus,
    storeName: vendor.storeName,
    note: vendor.approvalNote,
  });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    // Find user
    let user;
    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      user = await Admin.findById(decoded.userId);
    } else if (decoded.role === 'vendor') {
      user = await Vendor.findById(decoded.userId);
    } else {
      user = await User.findById(decoded.userId);
    }

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Check if refresh token matches
    if (user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new access token
    const { accessToken } = generateTokens(user._id.toString(), decoded.role);

    return apiResponse(res, 200, 'Token refreshed', {
      accessToken,
    });
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Protected
 */
export const logout = asyncHandler(async (req, res) => {
  // Optional token — best-effort server-side session invalidation
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.accessSecret);

      let UserModel;
      if (decoded.role === 'admin' || decoded.role === 'superadmin') UserModel = Admin;
      else if (decoded.role === 'vendor') UserModel = Vendor;
      else UserModel = User;

      const user = await UserModel.findById(decoded.userId);
      if (user) {
        user.lastLogoutAt = new Date();
        user.refreshToken = null;
        await user.save();
      }
    } catch {
      // Token invalid or expired — still log out successfully
    }
  }

  return apiResponse(res, 200, 'Logged out successfully');
});

/**
 * @route   POST /api/auth/login
 * @desc    Patient / Vendor login with email + password
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Try patient first
  let account = await User.findOne({ email: email.toLowerCase() }).select('+password');
  let isVendor = false;

  if (!account) {
    account = await Vendor.findOne({ email: email.toLowerCase() }).select('+password');
    isVendor = true;
  }

  if (!account) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!account.password) {
    throw new ApiError(400, 'This account was registered via OTP and has no password set. Please use the OTP login option or set a password via registration.', 'NO_PASSWORD');
  }

  const isMatch = await account.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(account._id.toString(), account.role);
  account.refreshToken = refreshToken;
  await account.save();

  if (isVendor) {
    return apiResponse(res, 200, 'Login successful', {
      accessToken,
      refreshToken,
      vendor: {
        id: account._id,
        storeName: account.storeName,
        ownerName: account.ownerName,
        email: account.email,
        role: account.role,
        approvalStatus: account.approvalStatus,
      },
      role: 'vendor',
    });
  }

  return apiResponse(res, 200, 'Login successful', {
    accessToken,
    refreshToken,
    user: {
      id: account._id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
      subscription: account.subscription,
      language: account.language,
    },
    role: 'patient',
  });
});

/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login
 * @access  Public
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find admin
  const admin = await Admin.findOne({ email });

  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Verify password using model method
  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if 2FA is enabled
  if (admin.isTwoFactorEnabled) {
    // Generate temporary session token
    const tempToken = jwt.sign(
      { adminId: admin._id, purpose: '2fa' },
      config.jwt.tempSecret,
      { expiresIn: '5m' }
    );

    return apiResponse(res, 200, '2FA required', {
      requires2FA: true,
      tempToken,
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(admin._id.toString(), admin.role);
  
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save();

  return apiResponse(res, 200, 'Login successful', {
    accessToken,
    refreshToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
  });
});

/**
 * @route   POST /api/auth/admin/verify-2fa
 * @desc    Verify 2FA token
 * @access  Public
 */
export const verifyTwoFactor = asyncHandler(async (req, res) => {
  const { tempToken, token } = req.body;

  if (!tempToken || !token) {
    throw new ApiError(400, 'Temp token and 2FA token are required');
  }

  // Verify temp token
  const decoded = jwt.verify(tempToken, config.jwt.tempSecret);

  if (decoded.purpose !== '2fa') {
    throw new ApiError(401, 'Invalid token');
  }

  const admin = await Admin.findById(decoded.adminId);

  if (!admin) {
    throw new ApiError(401, 'Invalid token');
  }

  // Verify 2FA token
  const verified = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!verified) {
    throw new ApiError(401, 'Invalid 2FA token');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(admin._id.toString(), admin.role);
  
  admin.refreshToken = refreshToken;
  admin.lastLogin = new Date();
  await admin.save();

  return apiResponse(res, 200, 'Login successful', {
    accessToken,
    refreshToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
  });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset link to email (works for user, vendor, admin)
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, 'Email is required');

  const normalizedEmail = email.toLowerCase().trim();

  // Search across all user types
  let userType = null;

  let user = await User.findOne({ email: normalizedEmail });
  if (user) userType = 'patient';

  if (!userType) {
    user = await Vendor.findOne({ email: normalizedEmail });
    if (user) userType = 'vendor';
  }

  if (!userType) {
    user = await Admin.findOne({ email: normalizedEmail });
    if (user) userType = 'admin';
  }

  // Always return the same response to prevent email enumeration
  if (!userType) {
    return apiResponse(res, 200, 'If an account with that email exists, a password reset link has been sent.');
  }

  // Generate a short-lived reset token (15 minutes)
  const resetToken = jwt.sign(
    { email: normalizedEmail, userType, purpose: 'password_reset' },
    config.jwt.accessSecret,
    { expiresIn: '15m' }
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(normalizedEmail, resetUrl, userType);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    throw new ApiError(500, 'Failed to send reset email. Please try again.');
  }

  return apiResponse(res, 200, 'If an account with that email exists, a password reset link has been sent.');
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using a token from the reset email
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, 'Token and new password are required');
  }

  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Verify the reset token
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch (err) {
    throw new ApiError(400, 'Invalid or expired reset link. Please request a new one.');
  }

  if (decoded.purpose !== 'password_reset') {
    throw new ApiError(400, 'Invalid reset token');
  }

  const { email, userType } = decoded;
  const hashedPassword = await bcrypt.hash(password, 12);

  let updated = false;
  if (userType === 'patient') {
    const result = await User.updateOne({ email }, { password: hashedPassword });
    updated = result.modifiedCount > 0;
  } else if (userType === 'vendor') {
    const result = await Vendor.updateOne({ email }, { password: hashedPassword });
    updated = result.modifiedCount > 0;
  } else if (userType === 'admin') {
    const result = await Admin.updateOne({ email }, { password: hashedPassword });
    updated = result.modifiedCount > 0;
  }

  if (!updated) {
    throw new ApiError(404, 'Account not found');
  }

  return apiResponse(res, 200, 'Password reset successfully. You can now log in with your new password.');
});

export default {
  sendOTP,
  verifyOTP,
  registerPatient,
  registerVendor,
  checkVendorStatus,
  refreshAccessToken,
  logout,
  adminLogin,
  verifyTwoFactor,
  forgotPassword,
  resetPassword,
};

